import { describe, expect, it } from "bun:test";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Layer } from "effect";
import {
  executeNotificationEndpoint,
  notificationEndpointIdentifiers,
  NotificationsAccessDenied,
  NotificationsAuthorization,
  NotificationsData,
  NotificationsNotFound,
  type NotificationCaller,
  type NotificationEndpointIdentifier,
  type NotificationGuildCaller,
  type NotificationRequest,
} from "./notifications.handlers.js";

const caller: NotificationCaller = {
  discordId: "discord-1",
  userId: "user-1",
};

const guildCaller: NotificationGuildCaller = {
  ...caller,
  guild: { id: "guild-a" } as NotificationGuildCaller["guild"],
  accessPolicy: createAccessPolicy({
    capabilities: [Permission.OWNER, Permission.ADMIN],
  }),
  roles: [],
};

const makeAuthorization = (
  overrides: Partial<NotificationsAuthorization["Service"]> = {},
) =>
  NotificationsAuthorization.of({
    requireCaller: Effect.succeed(caller),
    requireGuild: () => Effect.succeed(guildCaller),
    ...overrides,
  });

const makeData = (execute: NotificationsData["Service"]["execute"]) =>
  NotificationsData.of({ execute });

const services = (
  authorization: NotificationsAuthorization["Service"],
  data: NotificationsData["Service"],
) =>
  Layer.merge(
    Layer.succeed(NotificationsAuthorization, authorization),
    NotificationsData.layer(data),
  );

const success = async (
  endpoint: NotificationEndpointIdentifier,
  request: NotificationRequest,
) => {
  const calls: Array<{
    endpoint: NotificationEndpointIdentifier;
    request: NotificationRequest;
    caller: NotificationCaller | NotificationGuildCaller;
  }> = [];
  const response = { endpoint, ok: true };

  const result = await Effect.runPromise(
    executeNotificationEndpoint(endpoint, request).pipe(
      Effect.provide(
        services(
          makeAuthorization(),
          makeData((receivedEndpoint, receivedRequest, receivedCaller) => {
            calls.push({
              endpoint: receivedEndpoint,
              request: receivedRequest,
              caller: receivedCaller,
            });
            return Effect.succeed(response);
          }),
        ),
      ),
    ),
  );

  return { result, response, calls };
};

describe("Notifications HttpApi handlers", () => {
  it("covers every generated NotificationsGroup identifier exactly once", () => {
    expect(notificationEndpointIdentifiers).toHaveLength(27);
    expect(new Set(notificationEndpointIdentifiers).size).toBe(27);
  });

  it("delegates a guild target read with its scoped Organization context", async () => {
    const request = { params: { guildId: "guild-a" } };
    const { result, response, calls } = await success(
      "NotificationsGuildControllerGetGuildTargets",
      request,
    );

    expect(result).toBe(response);
    expect(calls).toEqual([
      {
        endpoint: "NotificationsGuildControllerGetGuildTargets",
        request,
        caller: guildCaller,
      },
    ]);
  });

  it("requires owner or admin before a guild rule mutation", async () => {
    const authorizationCalls: Array<{
      guildId: string;
      capabilities: ReadonlyArray<string>;
      mode: string;
    }> = [];
    const request = {
      params: { guildId: "guild-a" },
      payload: { name: "rule" },
    };

    await Effect.runPromise(
      executeNotificationEndpoint(
        "NotificationsGuildControllerCreateGuildRule",
        request,
      ).pipe(
        Effect.provide(
          services(
            makeAuthorization({
              requireGuild: (options) => {
                authorizationCalls.push(options);
                return Effect.succeed(guildCaller);
              },
            }),
            makeData(() => Effect.succeed({ id: "rule-1" })),
          ),
        ),
      ),
    );

    expect(authorizationCalls).toEqual([
      {
        guildId: "guild-a",
        capabilities: [Permission.OWNER, Permission.ADMIN],
        mode: "any",
      },
    ]);
  });

  it("delegates a quick-add mutation with the authenticated user identity", async () => {
    const request = { payload: { itemId: "item-1", guildId: "guild-a" } };
    const { calls } = await success(
      "NotificationsUserControllerQuickAddWatchedItem",
      request,
    );

    expect(calls).toEqual([
      {
        endpoint: "NotificationsUserControllerQuickAddWatchedItem",
        request,
        caller,
      },
    ]);
  });

  it("fails closed before data access when user authentication fails", async () => {
    const denied = new NotificationsAccessDenied({
      status: 401,
      code: "AUTHENTICATION_REQUIRED",
    });
    let dataAccessed = false;

    const error = await Effect.runPromise(
      Effect.flip(
        executeNotificationEndpoint(
          "NotificationsUserControllerGetUserTargets",
          {},
        ).pipe(
          Effect.provide(
            services(
              makeAuthorization({ requireCaller: Effect.fail(denied) }),
              makeData(() => {
                dataAccessed = true;
                return Effect.die("must not run");
              }),
            ),
          ),
        ),
      ),
    );

    expect(error).toBe(denied);
    expect(dataAccessed).toBe(false);
  });

  it("fails closed before data access when guild permission is missing", async () => {
    const denied = new NotificationsAccessDenied({
      status: 403,
      code: "OWNER_OR_ADMIN_REQUIRED",
    });
    let dataAccessed = false;

    const error = await Effect.runPromise(
      Effect.flip(
        executeNotificationEndpoint(
          "NotificationsGuildControllerCancelGuildJob",
          { params: { guildId: "guild-a", jobId: "job-1" } },
        ).pipe(
          Effect.provide(
            services(
              makeAuthorization({
                requireGuild: () => Effect.fail(denied),
              }),
              makeData(() => {
                dataAccessed = true;
                return Effect.die("must not run");
              }),
            ),
          ),
        ),
      ),
    );

    expect(error).toBe(denied);
    expect(dataAccessed).toBe(false);
  });

  it("does not cross the requested Organization boundary", async () => {
    const denied = new NotificationsAccessDenied({
      status: 403,
      code: "ORGANIZATION_ACCESS_DENIED",
    });
    const requestedGuilds: string[] = [];
    let dataAccessed = false;

    const error = await Effect.runPromise(
      Effect.flip(
        executeNotificationEndpoint(
          "NotificationsGuildControllerUpdateGuildTarget",
          {
            params: { guildId: "guild-b", targetId: "target-in-guild-a" },
            payload: {},
          },
        ).pipe(
          Effect.provide(
            services(
              makeAuthorization({
                requireGuild: (options) => {
                  requestedGuilds.push(options.guildId);
                  return Effect.fail(denied);
                },
              }),
              makeData(() => {
                dataAccessed = true;
                return Effect.die("must not run");
              }),
            ),
          ),
        ),
      ),
    );

    expect(error).toBe(denied);
    expect(requestedGuilds).toEqual(["guild-b"]);
    expect(dataAccessed).toBe(false);
  });

  it("preserves hidden-resource not-found from the delegated service", async () => {
    const notFound = new NotificationsNotFound({
      status: 404,
      code: "NOTIFICATION_TARGET_NOT_FOUND",
    });

    const error = await Effect.runPromise(
      Effect.flip(
        executeNotificationEndpoint(
          "NotificationsUserControllerUpdateUserTarget",
          { params: { targetId: "hidden-target" }, payload: {} },
        ).pipe(
          Effect.provide(
            services(
              makeAuthorization(),
              makeData(() => Effect.fail(notFound)),
            ),
          ),
        ),
      ),
    );

    expect(error).toBe(notFound);
    expect(error).toMatchObject({
      status: 404,
      code: "NOTIFICATION_TARGET_NOT_FOUND",
    });
  });
});
