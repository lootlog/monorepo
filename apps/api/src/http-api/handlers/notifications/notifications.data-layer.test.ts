import { describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";
import type { NotificationRuleOperations } from "#src/notifications/notification-rule-operations";
import type { NotificationGuildTargets } from "#src/notifications/notification-guild-targets";
import type { NotificationUserTargets } from "#src/notifications/notification-user-targets";
import type { NotificationJobOperations } from "#src/notifications/notification-job-operations";
import type { NotificationWatchedItems } from "#src/notifications/notification-watched-items";
import {
  NotificationsBadRequest,
  NotificationsData,
  NotificationsNotFound,
  type NotificationEndpointIdentifier,
  type NotificationGuildCaller,
  type NotificationRequest,
} from "./notifications.handlers.js";
import {
  notificationDataLayer,
  type NotificationDataServices,
} from "./notifications.data-layer.js";

const caller = {
  discordId: "discord-1",
  userId: "user-1",
  guild: { id: "guild-1" },
  accessPolicy: {},
  roles: [],
} as unknown as NotificationGuildCaller;

const requestFor = (): NotificationRequest => ({
  params: {
    guildId: "guild-1",
    jobId: "job-1",
    ruleId: 1,
    targetId: 2,
    watchedItemId: 3,
  },
  payload: {},
});

const makeServices = (operation: () => Promise<unknown>) => {
  const effectOperation = () =>
    Effect.tryPromise({ try: operation, catch: (cause) => cause });
  return {
    guildTargets: {
      available: effectOperation,
      create: effectOperation,
      list: effectOperation,
      remove: effectOperation,
      update: effectOperation,
    } as unknown as NotificationGuildTargets,
    jobOperations: {
      cancelGuild: effectOperation,
      listGuild: effectOperation,
      listUser: effectOperation,
    } as unknown as NotificationJobOperations,
    rules: {
      createGuild: effectOperation,
      createUser: effectOperation,
      deleteGuild: effectOperation,
      deleteUser: effectOperation,
      listGuild: effectOperation,
      listUser: effectOperation,
      rebuildGuildJobs: effectOperation,
      testGuild: effectOperation,
      updateGuild: effectOperation,
      updateUser: effectOperation,
    } as unknown as NotificationRuleOperations,
    userTargets: {
      create: effectOperation,
      list: effectOperation,
      remove: effectOperation,
      triggerTest: effectOperation,
      update: effectOperation,
    } as unknown as NotificationUserTargets,
    watchedItems: {
      create: effectOperation,
      list: effectOperation,
      quickAdd: effectOperation,
      remove: effectOperation,
    } as unknown as NotificationWatchedItems,
  } satisfies NotificationDataServices;
};

const execute = (
  services: NotificationDataServices,
  endpoint: NotificationEndpointIdentifier,
  request: NotificationRequest,
) =>
  Effect.runPromise(
    Effect.flatMap(NotificationsData, (data) =>
      data.execute(endpoint, request, caller),
    ).pipe(Effect.provide(notificationDataLayer(services))),
  );

describe("notification data layer", () => {
  it("directly maps success-only notification operations to service calls", async () => {
    const operation = mock(() => Promise.resolve({ ok: true }));
    const services = makeServices(operation);
    const endpoints = [
      "NotificationsGuildControllerDeleteGuildTarget",
      "NotificationsGuildControllerDeleteGuildRule",
      "NotificationsGuildControllerRebuildGuildRuleJobs",
      "NotificationsGuildControllerTriggerGuildRuleTest",
      "NotificationsGuildControllerCancelGuildJob",
      "NotificationsUserControllerDeleteUserTarget",
      "NotificationsUserControllerTriggerUserTargetTest",
      "NotificationsUserControllerDeleteUserRule",
      "NotificationsUserControllerDeleteWatchedItem",
    ] as const;

    await Promise.all(
      endpoints.map((endpoint) => execute(services, endpoint, requestFor())),
    );

    expect(operation).toHaveBeenCalledTimes(endpoints.length);
  });

  it("rejects malformed numeric identifiers before service work", async () => {
    const operation = mock(() => Promise.resolve({ ok: true }));
    const services = makeServices(operation);

    await expect(
      execute(services, "NotificationsUserControllerDeleteUserTarget", {
        params: { targetId: "not-a-number" },
      }),
    ).rejects.toBeInstanceOf(NotificationsBadRequest);
    expect(operation).not.toHaveBeenCalled();
  });

  it("maps application 404 failures to the typed notification error", async () => {
    const notFound = new Error("not found") as Error & {
      getStatus: () => number;
    };
    notFound.getStatus = () => 404;
    const operation = mock(() => Promise.reject(notFound));
    const services = makeServices(operation);

    await expect(
      execute(services, "NotificationsUserControllerGetUserTargets", {}),
    ).rejects.toBeInstanceOf(NotificationsNotFound);
  });

  it("encodes database timestamps with the endpoint response codec", async () => {
    const createdAt = new Date("2026-09-03T10:00:00.000Z");
    const target = {
      id: 1,
      ownerType: "USER",
      ownerId: "discord-1",
      provider: "DISCORD",
      targetType: "DM",
      externalId: "discord-1",
      displayName: null,
      guildName: null,
      metadata: null,
      active: true,
      canSend: true,
      lastSyncedAt: null,
      lastDeliveryAt: createdAt,
      lastDeliveryError: null,
      createdAt,
      updatedAt: createdAt,
      testTrigger: {
        limit: 3,
        used: 0,
        remaining: 3,
        windowSeconds: 3600,
        nextAvailableAt: null,
      },
    };
    const services = makeServices(() => Promise.resolve([target]));

    const result = await execute(
      services,
      "NotificationsUserControllerGetUserTargets",
      {},
    );

    expect(result).toEqual([
      {
        ...target,
        createdAt: createdAt.toISOString(),
        lastDeliveryAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
      },
    ]);
  });
});
