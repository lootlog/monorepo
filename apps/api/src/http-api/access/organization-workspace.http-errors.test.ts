import { SchemaErrorResponseLive } from "@lootlog/protocol/http/schema-error-response";
import { apiKeyEndpointPolicyLayer } from "@lootlog/protocol/http/api-key-http";
import { describe, expect, it } from "bun:test";
import {
  Cause,
  Effect,
  Exit,
  FileSystem,
  Layer,
  Path,
  Predicate,
} from "effect";
import {
  InvalidEntityError,
  ResourceConflictError,
  PermissionDeniedError,
} from "@lootlog/protocol/http/errors";
import { OrganizationWorkspaceOperationError } from "#src/guilds/organization-workspace-access";
import { ReservationsHandlers } from "../handlers/reservations/reservations.handlers.js";
import { RolesHandlers } from "../handlers/roles/roles.handlers.js";
import {
  OrganizationWorkspaceAccessDenied,
  OrganizationWorkspaceNotFound,
  toOrganizationWorkspaceHttpResponse,
} from "./organization-workspace.access.js";
import { Etag, HttpPlatform, HttpRouter } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { LootlogApi } from "../lootlog-api.js";
import { BearerSecurityMiddleware } from "#src/contracts/api-shared";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import {
  identity,
  makeData,
  makeAuthorization,
  provideServices,
} from "./organization-workspace.access.fixtures.js";

const respondThroughApi = <A, E>(
  services: ReturnType<typeof provideServices>,
  call: (
    client: Effect.Success<ReturnType<typeof workspaceApiClient>>,
  ) => Effect.Effect<A, E>,
) => {
  const bearer = BearerSecurityMiddleware.of({
    bearer: (effect) =>
      Effect.provideService(effect, ForwardAuthIdentity, identity),
  });

  const platform = Layer.mergeAll(
    Path.layer,
    Etag.layerWeak,
    HttpPlatform.layer,
  ).pipe(Layer.provideMerge(FileSystem.layerNoop({})));

  return Effect.runPromise(
    Effect.scoped(
      workspaceApiClient().pipe(
        Effect.provide(
          Layer.mergeAll(ReservationsHandlers, RolesHandlers).pipe(
            HttpRouter.provideRequest(services),
          ),
        ),
        Effect.provideService(BearerSecurityMiddleware, bearer),
        Effect.provide([
          apiKeyEndpointPolicyLayer("main"),
          SchemaErrorResponseLive,
        ]),
        Effect.flatMap(call),
      ),
    ).pipe(Effect.provide([services, platform])),
  );
};

const workspaceApiClient = () =>
  HttpApiTest.groups(LootlogApi, ["reservations", "roles"]);

describe("organization workspace HTTP error responses", () => {
  it.each([
    {
      cause: new InvalidEntityError({
        code: "ACTIVE_LIMIT_REACHED",
        details: { limit: 1 },
      }),
      status: 422,
      body: { code: "ACTIVE_LIMIT_REACHED", details: { limit: 1 } },
    },
    {
      cause: new ResourceConflictError({ code: "RESERVATION_OVERLAP" }),
      status: 409,
      body: { code: "RESERVATION_OVERLAP" },
    },
    {
      cause: new PermissionDeniedError({ code: "RESERVATION_MEMBER_REQUIRED" }),
      status: 403,
      body: { code: "RESERVATION_MEMBER_REQUIRED" },
    },
  ])(
    "returns reservation $status with a safe reason",
    async ({ cause, status, body }) => {
      const services = provideServices(
        makeAuthorization(),
        makeData({
          create: () =>
            Effect.fail(new OrganizationWorkspaceOperationError({ cause })),
        }),
      );

      const response = await respondThroughApi(services, (client) =>
        client.reservations
          .createReservation({
            params: { guildId: "guild-a", spotId: "driady" },
            payload: {
              startsAt: "2026-09-06T10:00:00.000Z",
              endsAt: "2026-09-06T10:30:00.000Z",
            },
            responseMode: "response-only",
          })
          .pipe(
            Effect.flatMap((response) =>
              Effect.map(response.text, (text) => ({
                status: response.status,
                text,
              })),
            ),
          ),
      );

      expect(response.status).toBe(status);
      expect(JSON.parse(response.text)).toEqual(body);
    },
  );

  it("returns a declared 403, not a server error, when role access is denied", async () => {
    const services = provideServices(
      makeAuthorization({
        requireGuild: () =>
          Effect.fail(
            new OrganizationWorkspaceAccessDenied({
              status: 403,
              code: "ADMIN_REQUIRED",
            }),
          ),
      }),
      makeData(),
    );

    const response = await respondThroughApi(services, (client) =>
      client.roles
        .RolesControllerGetGuildRoles({
          params: { guildId: "guild-a" },
          responseMode: "response-only",
        })
        .pipe(
          Effect.flatMap((response) =>
            Effect.map(response.text, (text) => ({
              status: response.status,
              text,
            })),
          ),
        ),
    );

    expect(response.status).toBe(403);
    expect(JSON.parse(response.text)).toEqual({ code: "ADMIN_REQUIRED" });
  });
});

it("keeps unknown infrastructure failures out of domain error responses", async () => {
  const cause = new Error("private database detail");

  const exit = await Effect.runPromiseExit(
    toOrganizationWorkspaceHttpResponse(
      Effect.fail(new OrganizationWorkspaceOperationError({ cause })),
    ),
  );

  expect(Exit.isFailure(exit)).toBe(true);

  if (Exit.isFailure(exit)) {
    expect(Cause.squash(exit.cause)).toBe(cause);
  }
});

it.each([
  new OrganizationWorkspaceAccessDenied({ status: 403, code: "FORBIDDEN" }),
  new OrganizationWorkspaceNotFound({ status: 404, code: "GUILD_NOT_FOUND" }),
])("preserves access denial status and code", async (error) => {
  const response = await Effect.runPromise(
    toOrganizationWorkspaceHttpResponse(Effect.fail(error)),
  );

  expect(response.status).toBe(error.status);
  expect(response.body._tag).toBe("Uint8Array");

  if (Predicate.isTagged(response.body, "Uint8Array")) {
    expect(JSON.parse(new TextDecoder().decode(response.body.body))).toEqual({
      code: error.code,
    });
  }
});
