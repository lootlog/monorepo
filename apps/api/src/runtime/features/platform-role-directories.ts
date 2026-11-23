import { AuthRpcGroup } from "@lootlog/rpc/auth";
import { boundedRpcCall, makeRpcClient } from "@lootlog/rpc/client";
import type { PlatformRole } from "@lootlog/schema/platform-roles";
import { Context, Effect, Layer } from "effect";
import {
  makeRefreshingRoleHolders,
  type RoleHolders,
} from "#src/platform-roles/role-holders";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

const callAuth = boundedRpcCall({ timeout: "5 seconds", retries: 0 });

const roleHolders = (role: PlatformRole) =>
  Effect.gen(function* () {
    const config = yield* ApiRuntimeConfig;

    const authRpc = yield* makeRpcClient(AuthRpcGroup, {
      ...config.rpc.auth,
      spanPrefix: "api.auth-rpc",
    });

    const fetchRoleHolders = Effect.gen(function* () {
      const { userIds } = yield* callAuth(() =>
        authRpc.listPlatformRoleHolders({ role }),
      );

      return userIds;
    });

    return yield* makeRefreshingRoleHolders({ fetchRoleHolders });
  });

export class GlobalChatAdminDirectory extends Context.Service<
  GlobalChatAdminDirectory,
  RoleHolders
>()("@lootlog/api/GlobalChatAdminDirectory") {
  static readonly layer = Layer.effect(
    GlobalChatAdminDirectory,
    roleHolders("global-chat-admin"),
  );
}

export class LootlogAdminDirectory extends Context.Service<
  LootlogAdminDirectory,
  RoleHolders
>()("@lootlog/api/LootlogAdminDirectory") {
  static readonly layer = Layer.effect(
    LootlogAdminDirectory,
    roleHolders("admin"),
  );
}
