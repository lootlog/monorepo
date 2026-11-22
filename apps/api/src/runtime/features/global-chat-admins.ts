import {
  PLATFORM_ROLE_HOLDERS_PATH,
  PlatformRoleHolders,
} from "@lootlog/schema/platform-roles";
import { Context, Effect, Layer, Redacted, Schema } from "effect";
import { HttpClient } from "effect/http";
import {
  fixedGlobalChatAdmins,
  type GlobalChatAdmins,
  makeRefreshingGlobalChatAdmins,
} from "#src/global-chat/global-chat-admins";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";
import { outboundHttpRequest } from "#src/shared/http/outbound-http";

const decodeRoleHolders = Schema.decodeUnknownEffect(
  Schema.fromJsonString(PlatformRoleHolders),
);

export class GlobalChatAdminDirectory extends Context.Service<
  GlobalChatAdminDirectory,
  GlobalChatAdmins
>()("@lootlog/api/GlobalChatAdminDirectory") {
  static readonly layer = Layer.effect(
    GlobalChatAdminDirectory,
    Effect.gen(function* () {
      const config = yield* ApiRuntimeConfig;
      const httpClient = yield* HttpClient.HttpClient;
      const secret = config.authIdpTokenSecret;

      if (!secret)
        return GlobalChatAdminDirectory.of(
          fixedGlobalChatAdmins(config.globalChatAdminUserIds),
        );

      const url = new URL(
        `${PLATFORM_ROLE_HOLDERS_PATH}?role=global-chat-admin`,
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

      return GlobalChatAdminDirectory.of(
        yield* makeRefreshingGlobalChatAdmins({
          configuredUserIds: config.globalChatAdminUserIds,
          fetchRoleHolders,
        }),
      );
    }),
  );
}
