import {
  type ApplicationError,
  InvalidRequestError,
} from "@lootlog/protocol/http/errors";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  type AdminOperator,
  AdminService,
  auditActor,
} from "#src/admin/admin-service";
import { AuthApi } from "#src/http-api/auth-api";
import { noStore, requestHeaders, respond } from "./responses.js";

const admin = <A>(
  run: (
    service: typeof AdminService.Service,
    actor: string,
    operator: AdminOperator,
  ) => Effect.Effect<A, ApplicationError>,
) =>
  respond(
    Effect.gen(function* () {
      yield* noStore;
      const service = yield* AdminService;
      const operator = yield* service.authorize(yield* requestHeaders);

      return yield* run(service, auditActor(operator), operator);
    }),
  );

export const AdminHandlers = HttpApiBuilder.group(
  AuthApi,
  "admin",
  (handlers) =>
    handlers
      .handle("AdminSession", () =>
        admin((_service, _actor, operator) => Effect.succeed(operator)),
      )
      .handle("AdminOverview", () => admin((service) => service.overview()))
      .handle("AdminListUsers", ({ query }) =>
        admin((service) => service.listUsers(query)),
      )
      .handle("AdminSearchUsers", ({ payload }) =>
        admin((service) => service.listUsers(payload)),
      )
      .handle("AdminGetUser", ({ params }) =>
        admin((service) => service.getUser(params.id)),
      )
      .handle("AdminSetUserRoles", ({ params, payload }) =>
        admin((service, actor) =>
          service.setRoles(actor, params.id, payload.roles),
        ),
      )
      .handle("AdminBanUser", ({ params, payload }) =>
        admin((service, actor, operator) =>
          params.id === operator.userId
            ? Effect.fail(
                new InvalidRequestError({
                  code: "CANNOT_BAN_SELF",
                  message: "An operator cannot ban their own account",
                }),
              )
            : service.ban(actor, params.id, payload),
        ),
      )
      .handle("AdminUnbanUser", ({ params }) =>
        admin((service, actor) => service.unban(actor, params.id)),
      )
      .handle("AdminRevokeUserSessions", ({ params }) =>
        admin((service, actor) => service.revokeSessions(actor, params.id)),
      )
      .handle("AdminRevokeUserSession", ({ params }) =>
        admin((service, actor) =>
          service.revokeSession(actor, params.id, params.sessionId),
        ),
      )
      .handle("AdminRevokeUserApiKey", ({ params }) =>
        admin((service, actor) =>
          service.revokeApiKey(actor, params.id, params.keyId),
        ),
      )
      .handle("AdminListAudit", ({ query }) =>
        admin((service) => service.listAudit(query)),
      ),
);
