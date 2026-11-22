import {
  type DiscordNotificationSendCommand,
  LootDrawResolvedNotificationEventSchema,
} from "@lootlog/schema/notifications";
import { Effect, Option, Schema } from "effect";
import type { JsonObject } from "#src/database/json";
import type { LootDrawCardImage } from "#src/notifications/content/loot-draw-card";

export type NotificationFiles = NonNullable<
  DiscordNotificationSendCommand["files"]
>;

const decodeLootDraw = Schema.decodeUnknownOption(
  LootDrawResolvedNotificationEventSchema,
);

export const makeNotificationImages = (
  card: Pick<LootDrawCardImage, "render">,
) => ({
  filesFor: (
    payload: JsonObject | undefined,
  ): Effect.Effect<NotificationFiles> =>
    Option.match(decodeLootDraw(payload?.lootDraw), {
      onNone: () => Effect.succeed([]),
      onSome: (event) =>
        card.render(event).pipe(
          Effect.map((png): NotificationFiles => [
            {
              name: "lootlog-kolo.png",
              contentType: "image/png",
              base64: png.toString("base64"),
            },
          ]),
          Effect.catch((error) =>
            Effect.logWarning("Failed to draw a loot draw's card", {
              error,
              drawId: event.draw.id,
            }).pipe(Effect.as([])),
          ),
        ),
    }),
});

export type NotificationImages = ReturnType<typeof makeNotificationImages>;
