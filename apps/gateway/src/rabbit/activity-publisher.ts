import {
  ACTIVITY_EVENT_SIGNATURE_HEADER,
  signActivityEvent,
} from "@lootlog/protocol/rabbit/activity-signature";
import type { RabbitMessagingService } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Clock, Effect, Redacted } from "effect";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import type { SessionData } from "#src/realtime/session";

export class ActivityPublisher {
  constructor(
    private readonly messaging: Pick<RabbitMessagingService, "publish">,
    private readonly config: Pick<
      GatewayConfiguration,
      "activityEventSignatureSecret"
    >,
  ) {}

  /**
   * Records a connection once per Lootlog and a disconnection only where the
   * connection was recorded, so each Lootlog sees a session only while it is
   * visible there. Without `requestedIds` a connection goes to every
   * Lootlog of the session and a disconnection to every recorded one.
   */
  publish(
    type: "CONNECT_EVENT" | "DISCONNECT_EVENT",
    session: SessionData,
    requestedIds?: readonly string[],
  ): Effect.Effect<void> {
    const { config, messaging } = this;

    return Effect.gen(function* () {
      const recorded = new Set(session.activityOrganizationIds);

      const organizationIds =
        type === "CONNECT_EVENT"
          ? (
              requestedIds ?? session.guilds.map(({ guild }) => guild.id)
            ).filter((id) => !recorded.has(id))
          : (requestedIds ?? [...recorded]).filter((id) => recorded.has(id));

      // Changed only after a confirmed publication, so a failed connection
      // is retried by the next one and a disconnection never precedes it.
      const record = (guildId: string) =>
        Effect.sync(() => {
          const current = session.activityOrganizationIds ?? [];

          session.activityOrganizationIds =
            type === "CONNECT_EVENT"
              ? [...new Set([...current, guildId])]
              : current.filter((id) => id !== guildId);
        });

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

          const signature = signActivityEvent(
            payload,
            Redacted.value(config.activityEventSignatureSecret),
          );

          return messaging
            .publish({
              routingKey: RabbitRoutingKey.ACTIVITY_LOG_CREATE,
              content: new TextEncoder().encode(JSON.stringify(payload)),
              headers: { [ACTIVITY_EVENT_SIGNATURE_HEADER]: signature },
            })
            .pipe(
              Effect.andThen(record(guildId)),
              Effect.catch((error) =>
                Effect.logWarning("Activity event publication failed").pipe(
                  Effect.annotateLogs({ error, guildId, type }),
                ),
              ),
            );
        },
        { concurrency: "unbounded", discard: true },
      );
    });
  }
}
