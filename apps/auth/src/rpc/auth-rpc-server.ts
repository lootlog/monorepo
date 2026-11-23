import { AuthRpcGroup } from "@lootlog/rpc/auth";
import {
  RpcBadRequestError,
  RpcUnauthorizedError,
  RpcUnavailableError,
} from "@lootlog/rpc/errors";
import { serviceRpcServer } from "@lootlog/rpc/server";
import type { ApplicationError } from "@lootlog/protocol/http/errors";
import { Effect, Layer, Schema } from "effect";
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
      group: AuthRpcGroup,
      handlers: AuthRpcHandlers,
      port: config.rpcPort,
      spanPrefix: "auth.rpc",
    }),
  ),
);
