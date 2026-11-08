import { Effect, Layer } from "effect";
import { characterAurasDataLayer } from "#src/http-api/handlers/character-auras/character-auras.data-layer";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

// Auras are a perk of the global chat admins and the Users they grant one.
export const characterAurasData = Layer.unwrap(
  Effect.map(ApiRuntimeConfig, ({ globalChatAdminUserIds }) =>
    characterAurasDataLayer(globalChatAdminUserIds),
  ),
);
