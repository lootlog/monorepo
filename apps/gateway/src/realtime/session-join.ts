import { diffAccessPolicies } from "@lootlog/protocol/realtime/access-policy";
import {
  CHARACTER_AURAS_FEATURE,
  KILL_STATS_FEATURE,
  type ClientCommand,
  type CommandSuccess,
  type ServerEvent,
} from "@lootlog/protocol/realtime";
import type { MargonemAccountVerifiedV1 } from "@lootlog/protocol/rabbit/events";
import { Clock, Effect } from "effect";
import type { MargonemProofVerifier } from "#src/auth/margonem-proof";
import type { GuildStore } from "#src/guilds/guild-store";
import type { ActivityPublisher } from "#src/rabbit/activity-publisher";
import type { NpcPresenceService } from "#src/realtime/npc-presence-service";
import type { PresenceStore } from "#src/realtime/presence-store";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import {
  GameCharacterRequired,
  isCommandFailure,
  NoAuthorizedOrganizations,
  OrganizationAccessDenied,
  RealtimeDependencyError,
  type CommandFailure,
  SubscriptionLimitExceeded,
} from "#src/realtime/realtime-errors";
import {
  scopedGuilds,
  sessionAccessPolicy,
} from "#src/realtime/session-access";
import type { GatewaySocket, SessionData } from "#src/realtime/session";
import {
  defaultScopes,
  organizationIds,
} from "#src/realtime/subscription-policy";

type Event = typeof ServerEvent.Type;

type JoinData = Extract<
  typeof ClientCommand.Type,
  { type: "session.join" }
>["data"];

/** What a join reads and writes outside the session itself. */
export interface SessionJoinDependencies {
  readonly guilds: Pick<GuildStore, "getUserGuilds">;
  readonly proofVerifier: MargonemProofVerifier;
  readonly publishAccountVerified: (
    event: MargonemAccountVerifiedV1,
  ) => Effect.Effect<void, unknown>;
  readonly presence: Pick<PresenceStore, "reconcileAccess">;
  readonly hub: Pick<
    RealtimeHub,
    "sendEvent" | "replaceSubscriptions" | "setPresence"
  >;
  readonly activity: Pick<ActivityPublisher, "publish">;
  readonly npcPresence: Pick<NpcPresenceService, "withdraw">;
}

/** Reports belong to the character and world that saw the NPCs. */
const withdrawNpcPresenceOnCharacterChange = (
  npcPresence: SessionJoinDependencies["npcPresence"],
  socket: GatewaySocket,
  character: JoinData["character"],
): Effect.Effect<void> => {
  const state = socket.data.npcPresence;

  if (
    !state ||
    (state.world === character?.world &&
      state.characterId === character?.characterId)
  )
    return Effect.void;

  return npcPresence
    .withdraw(socket)
    .pipe(
      Effect.catch(() => Effect.logWarning("NPC presence withdraw failed")),
    );
};

/** Gives a session its identity, access and default subscriptions. */
export const joinSession = (
  {
    activity,
    guilds,
    hub,
    npcPresence,
    presence,
    proofVerifier,
    publishAccountVerified,
  }: SessionJoinDependencies,
  socket: GatewaySocket,
  data: JoinData,
): Effect.Effect<CommandSuccess<"session.join">, CommandFailure> =>
  Effect.gen(function* () {
    const wasJoined = socket.data.joined;

    if (socket.data.platform === "game" && !data.character)
      return yield* Effect.fail(new GameCharacterRequired());

    if (
      socket.data.apiKeyAccess &&
      (data.character || data.margonemAccountProof)
    )
      return yield* Effect.fail(new OrganizationAccessDenied());

    // The session keeps its current identity until every fallible step
    // has passed, so a failed re-join leaves it as it was.
    let confidence: SessionData["confidence"] = "reported";
    let announceVerified: Effect.Effect<void> = Effect.void;

    if (data.character) {
      const verification = yield* proofVerifier.verify({
        proof: data.margonemAccountProof,
        socketId: socket.data.connectionId,
        accountId: data.character.accountId,
        characterId: data.character.characterId,
        clanId: data.character.clan?.id,
      });

      if (verification.valid) {
        confidence = "verified";

        // Other services trust account ownership only from this fact.
        announceVerified = publishAccountVerified({
          version: 1,
          userId: socket.data.userId,
          accountId: data.character.accountId,
          characterId: data.character.characterId,
          world: data.character.world,
          verifiedAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
        }).pipe(
          // A stalled broker must not hold the join.
          Effect.timeout("5 seconds"),
          Effect.catchCause((cause) =>
            Effect.logError(
              "Gateway account verification publish failed",
              cause,
            ),
          ),
        );
      }
    }

    // The fact is published whether or not the guild read succeeds.
    const [, userGuildsResult] = yield* Effect.all(
      [announceVerified, Effect.result(guilds.getUserGuilds(socket.data))],
      { concurrency: "unbounded" },
    );

    const userGuilds = yield* Effect.fromResult(userGuildsResult);
    yield* withdrawNpcPresenceOnCharacterChange(
      npcPresence,
      socket,
      data.character,
    );
    socket.data.character = data.character;
    socket.data.confidence = confidence;
    const authorizedGuilds = scopedGuilds(socket.data, userGuilds);

    if (authorizedGuilds.length === 0) {
      const previousPolicy = sessionAccessPolicy(socket.data);
      socket.data.guilds = [];
      socket.data.joined = false;
      socket.data.airTagScopes = [];
      hub.replaceSubscriptions(socket, []);
      const accessPolicy = sessionAccessPolicy(socket.data);
      // A new connection may have no server baseline while the client retains old cached data.
      hub.sendEvent(socket, {
        v: 1,
        type: "permissions.updated",
        data: {
          organizationIds: [],
          subscriptionScopes: [],
          accessPolicy,
          changes: diffAccessPolicies(previousPolicy, accessPolicy),
        },
      });

      if (wasJoined && !socket.data.apiKeyAccess) {
        yield* activity.publish(
          "DISCONNECT_EVENT",
          socket.data,
          previousPolicy.organizations.map(
            ({ organizationId }) => organizationId,
          ),
        );
      }

      yield* presence
        .reconcileAccess(socket)
        .pipe(
          Effect.catch(() =>
            Effect.logWarning(
              "Presence reconciliation failed after organization access was removed",
            ),
          ),
        );
      hub.setPresence(socket, undefined);

      return yield* Effect.fail(new NoAuthorizedOrganizations());
    }

    socket.data.guilds = authorizedGuilds;
    socket.data.characterAuras =
      data.features?.includes(CHARACTER_AURAS_FEATURE) === true;
    socket.data.killStats =
      data.features?.includes(KILL_STATS_FEATURE) === true;
    socket.data.joined = true;
    const scopes = defaultScopes(socket.data);
    yield* Effect.try({
      try: () => hub.replaceSubscriptions(socket, scopes),
      catch: (cause) =>
        cause instanceof SubscriptionLimitExceeded
          ? cause
          : new RealtimeDependencyError({
              operation: "replaceSubscriptions",
              cause,
            }),
    });

    const event = {
      v: 1,
      type: "session.joined",
      data: {
        connectionId: socket.data.connectionId,
        accessPolicy: sessionAccessPolicy(socket.data),
        organizationIds: organizationIds(socket.data),
        subscriptionScopes: scopes,
      },
    } satisfies Event;

    hub.sendEvent(socket, event);

    // A game session connects to a Lootlog when it starts publishing
    // presence there, so a Lootlog never logs a character hidden from it.
    if (
      !wasJoined &&
      !socket.data.apiKeyAccess &&
      socket.data.platform !== "game"
    )
      yield* activity.publish("CONNECT_EVENT", socket.data);

    return event.data;
  }).pipe(
    Effect.mapError((cause) =>
      isCommandFailure(cause)
        ? cause
        : new RealtimeDependencyError({ operation: "session.join", cause }),
    ),
  );
