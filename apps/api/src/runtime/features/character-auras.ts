import { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer } from "effect";
import {
  characterAurasDataLayer,
  type CharacterAurasEvents,
} from "#src/http-api/handlers/character-auras/character-auras.data-layer";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

const makeCharacterAurasEvents = (
  rabbit: RabbitMessaging["Service"],
): CharacterAurasEvents => ({
  publishChanged: (change) =>
    rabbit
      .publish({
        exchange: "default",
        routingKey: RabbitRoutingKey.CHARACTER_AURAS_CHANGED,
        content: new TextEncoder().encode(JSON.stringify(change)),
      })
      .pipe(Effect.asVoid),
});

// Global chat admins wear auras and grant them to other Users.
export const characterAurasData = Layer.unwrap(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const { globalChatAdminUserIds } = yield* ApiRuntimeConfig;

    return characterAurasDataLayer(
      globalChatAdminUserIds,
      makeCharacterAurasEvents(rabbit),
    );
  }),
);
