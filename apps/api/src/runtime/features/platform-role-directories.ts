import {
  PLATFORM_ROLE_HOLDERS_PATH,
  type PlatformRole,
  PlatformRoleHolders,
} from "@lootlog/schema/platform-roles";
import { Context, Effect, Layer, Redacted, Schema } from "effect";
import { HttpClient } from "effect/http";
import {
  fixedRoleHolders,
  makeRefreshingRoleHolders,
  type RoleHolders,
} from "#src/platform-roles/role-holders";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";
import { outboundHttpRequest } from "#src/shared/http/outbound-http";

const decodeRoleHolders = Schema.decodeUnknownEffect(
  Schema.fromJsonString(PlatformRoleHolders),
);

const roleHolders = (
  role: PlatformRole,
  configuredUserIds: (
    config: ApiRuntimeConfig["Service"],
  ) => ReadonlyArray<string>,
) =>
  Effect.gen(function* () {
    const config = yield* ApiRuntimeConfig;
    const httpClient = yield* HttpClient.HttpClient;
    const secret = config.authIdpTokenSecret;
    const configured = configuredUserIds(config);

    if (!secret) return fixedRoleHolders(configured);

    const url = new URL(
      `${PLATFORM_ROLE_HOLDERS_PATH}?role=${role}`,
      config.authServiceUrl,
    );

    const fetchRoleHolders = Effect.gen(function* () {
      const response = yield* outboundHttpRequest(httpClient, {
        adapter: "auth-platform-role-holders",
        headers: { authorization: `Bearer ${Redacted.value(secret)}` },
        method: "GET",
        responseLimitBytes: 1024 * 1024,
        retryTimes: 0,
        timeout: "5000 millis",
        url,
      });

      if (response.status !== 200)
        return yield* Effect.fail(`Auth service answered ${response.status}`);

      const { userIds } = yield* decodeRoleHolders(
        new TextDecoder().decode(response.body),
      );

      return userIds;
    });

    return yield* makeRefreshingRoleHolders({
      configuredUserIds: configured,
      fetchRoleHolders,
    });
  });

export class GlobalChatAdminDirectory extends Context.Service<
  GlobalChatAdminDirectory,
  RoleHolders
>()("@lootlog/api/GlobalChatAdminDirectory") {
  static readonly layer = Layer.effect(
    GlobalChatAdminDirectory,
    roleHolders("global-chat-admin", (config) => config.globalChatAdminUserIds),
  );
}

export class LootlogAdminDirectory extends Context.Service<
  LootlogAdminDirectory,
  RoleHolders
>()("@lootlog/api/LootlogAdminDirectory") {
  static readonly layer = Layer.effect(
    LootlogAdminDirectory,
    roleHolders("admin", () => []),
  );
}
