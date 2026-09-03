import { createHmac } from "node:crypto";
import type { RabbitMessagingService } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Clock, Effect, Redacted } from "effect";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import type { SessionData } from "#src/realtime/session";

const SIGNATURE_HEADER = "x-lootlog-activity-signature";

const stable = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .filter((key) => object[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${stable(object[key])}`)
    .join(",")}}`;
};

export class ActivityPublisher {
  constructor(
    private readonly messaging: RabbitMessagingService,
    private readonly config: GatewayConfiguration,
  ) {}

  publish(
    type: "CONNECT_EVENT" | "DISCONNECT_EVENT",
    session: SessionData,
    organizationIds = session.guilds.map(({ guild }) => guild.id),
  ): Effect.Effect<void> {
    const { config, messaging } = this;
    return Effect.gen(function* () {
      const timestamp = yield* Clock.currentTimeMillis;
      yield* Effect.forEach(
        organizationIds,
        (guildId) => {
          const player =
            session.platform === "game" ? session.character : undefined;
          if (session.platform === "game" && !player) return Effect.void;
          const payload = {
            userId: session.userId,
            guildId,
            discordId: session.discordId,
            type,
            source: session.platform === "game" ? "GAME" : "WEB_APP",
            world: player?.world,
            details: {
              sessionId: session.connectionId,
              userAgent: session.userAgent,
            },
            actorSnapshot: player
              ? {
                  accountId: Number(player.accountId),
                  characterId: Number(player.characterId),
                  clanName: player.clan?.name ?? "",
                  name: player.name,
                  clanId: player.clan?.id ?? 0,
                  icon: player.icon,
                  lvl: player.lvl,
                  prof: player.prof,
                }
              : undefined,
            idempotencyKey: `${type.toLowerCase()}_${session.connectionId}_${guildId}_${timestamp}`,
          };
          const signature = createHmac(
            "sha256",
            Redacted.value(config.activityEventSignatureSecret),
          )
            .update(stable(payload))
            .digest("hex");
          return messaging
            .publish({
              routingKey: RabbitRoutingKey.ACTIVITY_LOG_CREATE,
              content: new TextEncoder().encode(JSON.stringify(payload)),
              headers: { [SIGNATURE_HEADER]: signature },
            })
            .pipe(
              Effect.catch((cause) =>
                Effect.logWarning("Activity event publication failed").pipe(
                  Effect.annotateLogs({ cause, guildId, type }),
                ),
              ),
            );
        },
        { concurrency: "unbounded", discard: true },
      );
    });
  }
}
