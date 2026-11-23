import {
  AuthOperatorRpcGroup,
  AuthRpcGroup,
  AuthServedRpcGroup,
} from "@lootlog/rpc/auth";
import {
  RpcBadRequestError,
  RpcForbiddenError,
  RpcNotFoundError,
  RpcUnauthorizedError,
  RpcUnavailableError,
} from "@lootlog/rpc/errors";
import { serviceRpcServer } from "@lootlog/rpc/server";
import {
  type ApplicationError,
  InvalidRequestError,
} from "@lootlog/protocol/http/errors";
import type { AdminOperator } from "@lootlog/schema/admin";
import { Effect, Layer, type Redacted, Schema } from "effect";
import { auditActor } from "#src/admin/admin-auth";
import { AdminService } from "#src/admin/admin-service";
import { ApiKeyService } from "#src/auth/api-key-service";
import { AuthService } from "#src/auth/auth-service";
import { AppConfig } from "#src/config/env";

const isCodedErrorBody = Schema.is(Schema.Struct({ code: Schema.String }));

const errorCodeOrMessage = (error: ApplicationError): string =>
  isCodedErrorBody(error.body) ? error.body.code : error.message;

const mapAuthError = (error: ApplicationError) => {
  const message = errorCodeOrMessage(error);

  if (error.kind === "invalid-request") {
    return new RpcBadRequestError({ message });
  }

  if (error.kind === "authentication-required" || error.kind === "forbidden") {
    return new RpcUnauthorizedError({ message });
  }

  return new RpcUnavailableError({ message });
};

const mapUnavailableError = (error: ApplicationError) =>
  new RpcUnavailableError({ message: error.message });

const mapOperatorError = (error: ApplicationError) => {
  const message = errorCodeOrMessage(error);

  if (error.kind === "invalid-request") {
    return new RpcBadRequestError({ message });
  }

  if (error.kind === "authentication-required") {
    return new RpcUnauthorizedError({ message });
  }

  if (error.kind === "forbidden") return new RpcForbiddenError({ message });

  return new RpcUnavailableError({ message });
};

const mapOperatorOnUserError = (error: ApplicationError) =>
  error.kind === "not-found"
    ? new RpcNotFoundError({ message: errorCodeOrMessage(error) })
    : mapOperatorError(error);

export const AuthOperatorRpcHandlers = AuthOperatorRpcGroup.toLayer(
  Effect.gen(function* () {
    const admin = yield* AdminService;

    const asOperator = <A>(
      sessionCookie: Redacted.Redacted<string>,
      run: (
        actor: string,
        operator: AdminOperator,
      ) => Effect.Effect<A, ApplicationError>,
    ) =>
      Effect.flatMap(admin.authorize(sessionCookie), (operator) =>
        run(auditActor(operator), operator),
      );

    const read = <A>(
      sessionCookie: Redacted.Redacted<string>,
      run: () => Effect.Effect<A, ApplicationError>,
    ) => asOperator(sessionCookie, run).pipe(Effect.mapError(mapOperatorError));

    const onUser = <A>(
      sessionCookie: Redacted.Redacted<string>,
      run: (
        actor: string,
        operator: AdminOperator,
      ) => Effect.Effect<A, ApplicationError>,
    ) =>
      asOperator(sessionCookie, run).pipe(
        Effect.mapError(mapOperatorOnUserError),
      );

    return AuthOperatorRpcGroup.of({
      getOperator: ({ sessionCookie }) =>
        admin.authorize(sessionCookie).pipe(Effect.mapError(mapOperatorError)),
      getUsersOverview: ({ sessionCookie }) =>
        read(sessionCookie, () => admin.overview),
      searchUsers: ({ sessionCookie, ...search }) =>
        read(sessionCookie, () => admin.listUsers(search)),
      getUserDetails: ({ sessionCookie, userId }) =>
        onUser(sessionCookie, () => admin.getUser(userId)),
      setUserRoles: ({ sessionCookie, userId, roles }) =>
        onUser(sessionCookie, (actor) => admin.setRoles(actor, userId, roles)),
      banUser: ({ sessionCookie, userId, ...ban }) =>
        onUser(sessionCookie, (actor, operator) =>
          userId === operator.userId
            ? Effect.fail(
                new InvalidRequestError({
                  code: "CANNOT_BAN_SELF",
                  message: "An operator cannot ban their own account",
                }),
              )
            : admin.ban(actor, userId, ban),
        ),
      unbanUser: ({ sessionCookie, userId }) =>
        onUser(sessionCookie, (actor) => admin.unban(actor, userId)),
      revokeUserSessions: ({ sessionCookie, userId }) =>
        onUser(sessionCookie, (actor) => admin.revokeSessions(actor, userId)),
      revokeUserSession: ({ sessionCookie, userId, sessionId }) =>
        onUser(sessionCookie, (actor) =>
          admin.revokeSession(actor, userId, sessionId),
        ),
      revokeUserApiKey: ({ sessionCookie, userId, keyId }) =>
        onUser(sessionCookie, (actor) =>
          admin.revokeApiKey(actor, userId, keyId),
        ),
      listAuditLog: ({ sessionCookie, ...page }) =>
        read(sessionCookie, () => admin.listAudit(page)),
    });
  }),
);

const AuthRpcHandlers = AuthRpcGroup.toLayer(
  Effect.gen(function* () {
    const auth = yield* AuthService;
    const admin = yield* AdminService;
    const apiKeys = yield* ApiKeyService;

    return AuthRpcGroup.of({
      getIdpToken: (payload) =>
        auth.getIdpTokenResponse(payload).pipe(Effect.mapError(mapAuthError)),
      listPlatformRoleHolders: ({ role }) =>
        admin
          .listRoleHolders(role)
          .pipe(
            Effect.mapError((error) =>
              error.kind === "invalid-request"
                ? new RpcBadRequestError({ message: error.message })
                : new RpcUnavailableError({ message: error.message }),
            ),
          ),
      getApiKeyStatuses: ({ keyIds }) =>
        apiKeys.statuses(keyIds).pipe(Effect.mapError(mapUnavailableError)),
    });
  }),
);

export const AuthRpcServer = Layer.unwrap(
  Effect.map(AppConfig, (config) =>
    serviceRpcServer({
      group: AuthServedRpcGroup,
      handlers: Layer.merge(AuthRpcHandlers, AuthOperatorRpcHandlers),
      callerTokens: config.rpc.callerTokens,
      port: config.rpc.port,
      spanPrefix: "auth.rpc",
    }),
  ),
);
