import { describe, expect, mock, test } from "bun:test";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { controllerRoutes } from "./controller-routes.generated.js";
import { createControllerDispatcher } from "./legacy-controller-dispatcher.js";

const caller = {
  userId: "user-1",
  discordId: "discord-1",
  guild: { id: "guild-1" },
  member: { id: "member-1" },
  accessPolicy: createAccessPolicy({ capabilities: ["LOOTLOG_EVENTS_READ"] }),
  roles: [{ id: "role-1" }],
};

const makeRegistry = () => {
  const calls = new Map<string, ReturnType<typeof mock>>();
  const controllers: Record<
    string,
    Record<string, ReturnType<typeof mock>>
  > = {};

  for (const [endpoint, route] of Object.entries(controllerRoutes)) {
    const call = mock((...arguments_: ReadonlyArray<unknown>) => arguments_);
    calls.set(endpoint, call);
    controllers[route.controller] ??= {};
    controllers[route.controller][route.method] = call;
  }

  return { calls, dispatch: createControllerDispatcher(controllers) };
};

describe("static service dispatcher", () => {
  test("reconstructs body, query and authorized organization arguments", async () => {
    const { calls, dispatch } = makeRegistry();

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

  test("reconstructs forwarded identity arguments", async () => {
    const { calls, dispatch } = makeRegistry();

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

  test("fails closed for a missing operation", () => {
    const { dispatch } = makeRegistry();
    expect(() => dispatch("missing" as never, {}, caller as never)).toThrow(
      "Missing controller route for missing",
    );
  });
});
