import { describe, expect, it } from "bun:test";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Layer } from "effect";
import {
  EventsAccessDenied,
  EventsAuthorization,
  EventsData,
  EventsNotFound,
  executeEventEndpoint,
  type AuthorizedEventCaller,
  type EventAuthorizationRequirement,
  type EventEndpointIdentifier,
  type EventRequest,
} from "./events.handlers.js";

const caller: AuthorizedEventCaller = {
  discordId: "discord-1",
  userId: "user-1",
  guild: { id: "guild-a" } as AuthorizedEventCaller["guild"],
  member: { id: 12 } as AuthorizedEventCaller["member"],
  accessPolicy: createAccessPolicy({
    capabilities: [
      Permission.LOOTLOG_EVENTS_READ,
      Permission.LOOTLOG_EVENTS_WRITE,
      Permission.LOOTLOG_EVENTS_MANAGE,
    ],
  }),
  roles: [],
};

const makeAuthorization = (
  requireGuild: EventsAuthorization["Service"]["requireGuild"],
) => EventsAuthorization.of({ requireGuild });

const makeData = (execute: EventsData["Service"]["execute"]) =>
  EventsData.of({ execute });

const services = (
  authorization: EventsAuthorization["Service"],
  data: EventsData["Service"],
) =>
  Layer.merge(
    Layer.succeed(EventsAuthorization, authorization),
    EventsData.layer(data),
  );

const runSuccessCase = async (
  endpoint: EventEndpointIdentifier,
  expectedRequirement: Omit<EventAuthorizationRequirement, "guildId">,
) => {
  const authorizationCalls: EventAuthorizationRequirement[] = [];
  const dataCalls: Array<{
    endpoint: EventEndpointIdentifier;
    request: EventRequest;
  }> = [];
  const request = { params: { guildId: "guild-a", eventId: "event-1" } };
  const resultValue = { endpoint, ok: true };

  const result = await Effect.runPromise(
    executeEventEndpoint(endpoint, request).pipe(
      Effect.provide(
        services(
          makeAuthorization((requirement) => {
            authorizationCalls.push(requirement);
            return Effect.succeed(caller);
          }),
          makeData((receivedEndpoint, receivedRequest) => {
            dataCalls.push({
              endpoint: receivedEndpoint,
              request: receivedRequest,
            });
            return Effect.succeed(resultValue);
          }),
        ),
      ),
    ),
  );

  expect(result).toEqual(resultValue);
  expect(authorizationCalls).toEqual([
    { guildId: "guild-a", ...expectedRequirement },
  ]);
  expect(dataCalls).toEqual([{ endpoint, request }]);
};

describe("Events HttpApi handlers", () => {
  it("runs catalog reads behind event visibility permission", async () => {
    await runSuccessCase("showEvent", {
      capabilities: [Permission.LOOTLOG_EVENTS_READ],
      mode: "all",
    });
  });

  it("runs assignments behind manage permission", async () => {
    await runSuccessCase("EventsAssignmentControllerAssignMember", {
      capabilities: [Permission.LOOTLOG_EVENTS_MANAGE],
      mode: "all",
    });
  });

  it("runs scoring edits only for owner or admin", async () => {
    await runSuccessCase("EventsRankingControllerUpdateKillPoint", {
      capabilities: [Permission.OWNER, Permission.ADMIN],
      mode: "any",
    });
  });

  it("runs monitoring reads behind event visibility permission", async () => {
    await runSuccessCase("EventsMonitoringControllerGetCoordination", {
      capabilities: [Permission.LOOTLOG_EVENTS_READ],
      mode: "all",
    });
  });

  it("fails closed before data access when authentication or permission fails", async () => {
    const denied = new EventsAccessDenied({
      status: 401,
      code: "AUTHENTICATION_REQUIRED",
    });
    let dataAccessed = false;

    const error = await Effect.runPromise(
      Effect.flip(
        executeEventEndpoint("listEvents", {
          params: { guildId: "guild-a" },
        }).pipe(
          Effect.provide(
            services(
              makeAuthorization(() => Effect.fail(denied)),
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
    const denied = new EventsAccessDenied({
      status: 403,
      code: "ORGANIZATION_ACCESS_DENIED",
    });
    const requestedGuilds: string[] = [];
    let dataAccessed = false;

    const error = await Effect.runPromise(
      Effect.flip(
        executeEventEndpoint("showEvent", {
          params: { guildId: "guild-b", eventId: "event-in-guild-a" },
        }).pipe(
          Effect.provide(
            services(
              makeAuthorization((requirement) => {
                requestedGuilds.push(requirement.guildId);
                return Effect.fail(denied);
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

  it("preserves hidden-resource not-found from the scoped data layer", async () => {
    const notFound = new EventsNotFound({
      status: 404,
      code: "EVENT_NOT_FOUND",
    });

    const error = await Effect.runPromise(
      Effect.flip(
        executeEventEndpoint("showEvent", {
          params: { guildId: "guild-a", eventId: "hidden-event" },
        }).pipe(
          Effect.provide(
            services(
              makeAuthorization(() => Effect.succeed(caller)),
              makeData(() => Effect.fail(notFound)),
            ),
          ),
        ),
      ),
    );

    expect(error).toBe(notFound);
    expect(error).toMatchObject({ status: 404, code: "EVENT_NOT_FOUND" });
  });
});
