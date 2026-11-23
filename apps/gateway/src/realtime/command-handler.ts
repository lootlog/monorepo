import { recordRealtimeCommand } from "#src/realtime/connection-metrics";
import {
  runCommandRoute,
  type CommandRoutes,
} from "#src/realtime/command-routes";
import { parseRealtimeJson } from "@lootlog/protocol/realtime/codec";
import {
  decodeClientCommand,
  REALTIME_ERROR_REASONS,
  type ClientCommand,
  type CommandSuccess,
  type Response,
} from "@lootlog/protocol/realtime";
import type { MargonemAccountVerifiedV1 } from "@lootlog/protocol/rabbit/events";
import {
  Cause,
  Effect,
  Exit,
  Function,
  Option,
  Schema,
  Context,
  Layer,
} from "effect";
import {
  type GuildStore,
  type GuildStoreFailure,
  Guilds,
} from "#src/guilds/guild-store";
import {
  type MargonemProofVerifier,
  ProofVerifier,
} from "#src/auth/margonem-proof";
import {
  type ActivityPublisher,
  Activity,
} from "#src/rabbit/activity-publisher";
import { AccessRebalancer } from "#src/realtime/access-rebalance";
import {
  type AirTagService,
  AirTags,
  airTagRoutes,
} from "#src/realtime/air-tag-service";
import {
  BattlePings,
  battlePingRoutes,
} from "#src/realtime/battle-ping-service";
import { LootSplits, lootSplitRoutes } from "#src/realtime/loot-split-service";
import {
  type NpcPresenceService,
  NpcPresence,
  npcPresenceRoutes,
} from "#src/realtime/npc-presence-service";
import {
  CommandAdmission,
  JOIN_ADMISSION_LIMITS,
  CommandAdmissions,
} from "#src/realtime/command-admission";
import { MapPings, mapPingRoutes } from "#src/realtime/map-ping-service";
import { type PresenceStore, Presence } from "#src/realtime/presence-store";
import { type RealtimeHub, Hub } from "#src/realtime/realtime-hub";
import { hasValidApiKeyLease, type GatewaySocket } from "#src/realtime/session";
import {
  sessionRoutes,
  type SessionCommand,
} from "#src/realtime/session-routes";
import {
  commandFailureDetails,
  isCommandFailure,
  OrganizationAccessDenied,
  RealtimeDependencyError,
  type CommandFailure,
  SessionNotJoined,
} from "#src/realtime/realtime-errors";
import { RabbitMessaging, eventMessage } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";

type Command = ClientCommand;

type RealtimeResponse = Response;

const temporarilyUnavailable = {
  reason: REALTIME_ERROR_REASONS.temporarilyUnavailable,
  message: "command temporarily unavailable",
  retryable: true,
};

const commandRejected = (
  requestId: string,
  { retryAfterMs, ...details }: ReturnType<typeof commandFailureDetails>,
): RealtimeResponse => {
  const error = { code: "COMMAND_REJECTED", ...details };

  return {
    v: 1,
    requestId,
    status: "error",
    error: retryAfterMs === undefined ? error : { ...error, retryAfterMs },
  };
};

const invalidPayloadRejection = Function.compose(
  Schema.decodeUnknownOption(
    Schema.Struct({
      v: Schema.Literal(1),
      requestId: Schema.NonEmptyString,
      type: Schema.Literals([
        "map-ping.send",
        "battle-ping.send",
        "loot-split.send",
        "loot-split.auto-accept",
        "air-tag.observation",
      ]),
    }),
  ),
  Option.match({
    onNone: (): RealtimeResponse | null => null,
    onSome: (input): RealtimeResponse => ({
      v: 1,
      requestId: input.requestId,
      status: "success",
      data: { status: "rejected", code: "invalid-payload" },
    }),
  }),
);

export type FeatureRoutes = Omit<CommandRoutes, SessionCommand>;

export const gatewayFeatureRoutes = (features: {
  readonly mapPings: Parameters<typeof mapPingRoutes>[0];
  readonly battlePings: Parameters<typeof battlePingRoutes>[0];
  readonly lootSplits: Parameters<typeof lootSplitRoutes>[0];
  readonly airTags: Parameters<typeof airTagRoutes>[0];
  readonly airTagObservationAdmission: Parameters<typeof airTagRoutes>[1];
  readonly npcPresence: Parameters<typeof npcPresenceRoutes>[0];
}): FeatureRoutes => ({
  ...mapPingRoutes(features.mapPings),
  ...battlePingRoutes(features.battlePings),
  ...lootSplitRoutes(features.lootSplits),
  ...airTagRoutes(features.airTags, features.airTagObservationAdmission),
  ...npcPresenceRoutes(features.npcPresence),
});

export class CommandHandler {
  private readonly routes: CommandRoutes;

  private readonly access: AccessRebalancer;

  constructor(
    guilds: GuildStore,
    proofVerifier: MargonemProofVerifier,
    publishAccountVerified: (
      event: MargonemAccountVerifiedV1,
    ) => Effect.Effect<void, unknown>,
    presence: Pick<
      PresenceStore,
      "heartbeat" | "publish" | "snapshot" | "reconcileAccess"
    >,
    private readonly hub: Pick<
      RealtimeHub,
      | "onPermissionRebalance"
      | "globalChatCounts"
      | "sendResponse"
      | "sendEvent"
      | "replaceSubscriptions"
      | "setPresence"
      | "getLocalSocketsForUser"
      | "publishPermissionRebalance"
      | "reconnectUser"
      | "subscribe"
      | "unsubscribe"
    >,
    activity: Pick<ActivityPublisher, "publish">,
    sessionFeatures: {
      readonly npcPresence: Pick<NpcPresenceService, "refresh" | "withdraw">;
      readonly airTags: Pick<AirTagService, "registerInterest">;
    },
    featureRoutes: FeatureRoutes,
    joinAdmission: Pick<CommandAdmission, "tryAcquire"> = new CommandAdmission(
      JOIN_ADMISSION_LIMITS,
    ),
  ) {
    this.routes = {
      ...sessionRoutes({
        guilds,
        proofVerifier,
        publishAccountVerified,
        presence,
        hub,
        activity,
        sessionFeatures,
        joinAdmission,
      }),
      ...featureRoutes,
    };
    this.access = new AccessRebalancer(guilds, hub, activity, presence);
    this.hub.onPermissionRebalance((discordId, userId) =>
      this.access.enforceRebalance(discordId, userId),
    );
  }

  handle(socket: GatewaySocket, input: string | Buffer): Effect.Effect<void> {
    return this.process(socket, input, false);
  }

  rejectOverloaded(socket: GatewaySocket, input: string | Buffer): void {
    Effect.runSync(this.process(socket, input, true));
  }

  private process(
    socket: GatewaySocket,
    input: string | Buffer,
    overloaded: boolean,
  ): Effect.Effect<void> {
    if (!hasValidApiKeyLease(socket.data))
      return Effect.sync(() =>
        socket.close(1008, "API key authorization expired"),
      );
    let decoded: unknown;

    if (Buffer.isBuffer(input))
      return Effect.sync(() => socket.close(1003, "text JSON frames required"));

    try {
      decoded = parseRealtimeJson(input);
    } catch {
      return Effect.sync(() => socket.close(1007, "malformed realtime frame"));
    }

    let command: Command;

    try {
      command = decodeClientCommand(decoded);
    } catch {
      const rejection = invalidPayloadRejection(decoded);

      if (rejection) {
        return Effect.sync(() => {
          this.hub.sendResponse(socket, rejection);
        });
      }

      return Effect.sync(() => socket.close(1007, "malformed realtime frame"));
    }

    if (overloaded) {
      return Effect.sync(() => {
        this.hub.sendResponse(
          socket,
          commandRejected(command.requestId, temporarilyUnavailable),
        );
      });
    }

    const dispatch = Effect.suspend(() => this.dispatch(socket, command)).pipe(
      Effect.tap((data) =>
        Effect.sync(() => {
          this.hub.sendResponse(socket, {
            v: 1,
            requestId: command.requestId,
            status: "success",
            data,
          });
        }),
      ),
      Effect.onExit((exit) => {
        if (Exit.isSuccess(exit))
          return recordRealtimeCommand(command.type, "success");

        if (Cause.hasDies(exit.cause))
          return recordRealtimeCommand(command.type, "defect");

        if (Cause.hasInterruptsOnly(exit.cause))
          return recordRealtimeCommand(command.type, "interrupted");

        const error = Option.getOrUndefined(Cause.findErrorOption(exit.cause));

        const retryable =
          !isCommandFailure(error) || commandFailureDetails(error).retryable;

        return recordRealtimeCommand(
          command.type,
          retryable ? "retryable" : "rejected",
        );
      }),
    );

    const traced = this.routes[command.type].traced
      ? dispatch.pipe(
          Effect.withSpan("gateway.command", {
            attributes: { "rpc.method": command.type },
          }),
        )
      : dispatch;

    return traced.pipe(
      Effect.catchCause((cause) => {
        if (Cause.hasInterruptsOnly(cause)) return Effect.interrupt;
        const error = Option.getOrUndefined(Cause.findErrorOption(cause));

        const failure = isCommandFailure(error)
          ? commandFailureDetails(error)
          : temporarilyUnavailable;

        const respond = Effect.sync(() => {
          this.hub.sendResponse(
            socket,
            commandRejected(command.requestId, failure),
          );
        });

        return Cause.hasDies(cause)
          ? respond.pipe(Effect.andThen(Effect.die(Cause.squash(cause))))
          : respond;
      }),
      Effect.asVoid,
    );
  }

  rebalanceUser(
    discordId: string,
    userId: string,
  ): Effect.Effect<void, GuildStoreFailure> {
    return this.access.rebalanceUser(discordId, userId);
  }

  rebalanceAcrossInstances(
    discordId: string,
    userId: string,
    removedOrganizationId?: string,
  ): Effect.Effect<void, unknown> {
    return this.access.rebalanceAcrossInstances(
      discordId,
      userId,
      removedOrganizationId,
    );
  }

  private dispatch(
    socket: GatewaySocket,
    command: Command,
  ): Effect.Effect<CommandSuccess<Command["type"]>, CommandFailure> {
    if (!hasValidApiKeyLease(socket.data))
      return Effect.fail(new OrganizationAccessDenied());

    if (socket.data.closing)
      return Effect.fail(
        new RealtimeDependencyError({
          operation: command.type,
          cause: "session is closing",
        }),
      );

    const route = this.routes[command.type];

    if (socket.data.apiKeyAccess && !route.apiKey)
      return Effect.fail(new OrganizationAccessDenied());

    if (route.joined && !socket.data.joined)
      return Effect.fail(new SessionNotJoined());

    return runCommandRoute(this.routes, socket, command.type, command.data);
  }
}

export class Commands extends Context.Service<Commands, CommandHandler>()(
  "@lootlog/gateway/realtime/Commands",
) {
  static readonly layer = Layer.effect(
    Commands,
    Effect.gen(function* () {
      const messaging = yield* RabbitMessaging;
      const admissions = yield* CommandAdmissions;
      const airTags = yield* AirTags;
      const npcPresence = yield* NpcPresence;

      return new CommandHandler(
        yield* Guilds,
        yield* ProofVerifier,
        (event) =>
          messaging
            .publish(
              eventMessage(
                RabbitRoutingKey.MARGONEM_ACCOUNT_VERIFIED_V1,
                event,
              ),
            )
            .pipe(Effect.asVoid),
        yield* Presence,
        yield* Hub,
        yield* Activity,
        { npcPresence, airTags },
        gatewayFeatureRoutes({
          mapPings: yield* MapPings,
          battlePings: yield* BattlePings,
          lootSplits: yield* LootSplits,
          airTags,
          airTagObservationAdmission: admissions.airTagObservations,
          npcPresence,
        }),
        admissions.joins,
      );
    }),
  );
}
