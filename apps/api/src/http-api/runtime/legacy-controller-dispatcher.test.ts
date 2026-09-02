import { describe, expect, mock, test } from "bun:test";
import type { INestApplicationContext, Type } from "@nestjs/common";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { createControllerDispatcher } from "./legacy-controller-dispatcher.js";

const caller = {
  userId: "user-1",
  discordId: "discord-1",
  guild: { id: "guild-1" },
  member: { id: "member-1" },
  accessPolicy: createAccessPolicy({ capabilities: ["LOOTLOG_EVENTS_READ"] }),
  roles: [{ id: "role-1" }],
};

const makeApplication = () => {
  const calls = new Map<string, ReturnType<typeof mock>>();
  const application = {
    get(controllerType: Type<unknown>) {
      const controller = Object.create(controllerType.prototype) as Record<
        string,
        (...arguments_: unknown[]) => unknown
      >;
      for (const methodName of Object.getOwnPropertyNames(
        controllerType.prototype,
      )) {
        if (methodName === "constructor") continue;
        const method = controllerType.prototype[methodName] as unknown;
        if (typeof method !== "function") continue;
        const operation = Reflect.getMetadata(
          "swagger/apiOperation",
          method,
        ) as { readonly operationId?: string } | undefined;
        const operationId =
          operation?.operationId ??
          `${controllerType.name}${methodName[0]?.toUpperCase()}${methodName.slice(1)}`;
        const call = mock((...arguments_: unknown[]) => arguments_);
        calls.set(operationId, call);
        controller[methodName] = call;
      }
      return controller;
    },
  } as unknown as INestApplicationContext;
  return { application, calls };
};

describe("legacy controller dispatcher", () => {
  test("reconstructs body, query and authorized organization arguments", async () => {
    const { application, calls } = makeApplication();
    const dispatch = createControllerDispatcher(application);

    await dispatch(
      "listEvents",
      {
        params: { guildId: "guild-1" },
        query: { world: "Classic", activeOnly: true },
      },
      caller as never,
    );
    await dispatch(
      "createEvent",
      {
        params: { guildId: "guild-1" },
        payload: { name: "Event" },
      },
      caller as never,
    );

    expect(calls.get("listEvents")).toHaveBeenCalledWith(
      caller.guild,
      caller.accessPolicy,
      "Classic",
      true,
      caller.roles,
    );
    expect(calls.get("createEvent")).toHaveBeenCalledWith(
      { name: "Event" },
      caller.guild,
    );
  });

  test("reconstructs forwarded identity arguments without a synthetic HTTP request", async () => {
    const { application, calls } = makeApplication();
    const dispatch = createControllerDispatcher(application);

    await dispatch(
      "NotificationsUserControllerCreateWatchedItem",
      { payload: { itemId: "item-1" } },
      caller as never,
    );

    expect(
      calls.get("NotificationsUserControllerCreateWatchedItem"),
    ).toHaveBeenCalledWith(caller.discordId, caller.userId, {
      itemId: "item-1",
    });
  });

  test("fails closed for an operation missing from the established controllers", () => {
    const { application } = makeApplication();
    const dispatch = createControllerDispatcher(application);

    expect(() => dispatch("missing" as never, {}, caller as never)).toThrow(
      "Missing controller route for missing",
    );
  });
});
