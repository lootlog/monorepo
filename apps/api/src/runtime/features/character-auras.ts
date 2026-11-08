import { Effect, Layer } from "effect";
import { characterAurasDataLayer } from "#src/http-api/handlers/character-auras/character-auras.data-layer";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

// Global chat admins wear auras and grant them to other Users.
export const characterAurasData = Layer.unwrap(
  Effect.map(ApiRuntimeConfig, ({ globalChatAdminUserIds }) =>
    characterAurasDataLayer(globalChatAdminUserIds),
  ),
);
