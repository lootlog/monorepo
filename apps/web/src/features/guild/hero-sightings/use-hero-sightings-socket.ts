import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { HeroSightingResponseDto } from "@lootlog/client/main";
import type { AccessPolicyChange } from "@lootlog/protocol/realtime/access-policy";
import { DateTimeString } from "@lootlog/schema/http-scalars";
import { Option, Schema } from "effect";
import type {
  GatewayAccessUpdate,
  GatewayClient,
  GatewayJoin,
} from "@/lib/gateway-client";
import {
  heroSightingQueries,
  writeHeroSightingToCache,
} from "./hero-sighting-cache";

const MemberView = Schema.Struct({
  memberId: Schema.Finite,
  userId: Schema.NullOr(Schema.String),
  displayName: Schema.String,
  avatarUrl: Schema.NullOr(Schema.String),
});

// The gateway forwards the API's HeroSightingResponseDto. Validate the fields
// this view reads before putting an incremental payload in cache.
const decodeHeroSightingView = Schema.decodeUnknownOption(
  Schema.Struct({
    id: Schema.Finite,
    guildId: Schema.NonEmptyString,
    world: Schema.NonEmptyString,
    hero: Schema.Struct({
      key: Schema.NonEmptyString,
      name: Schema.String,
      lvl: Schema.Finite,
    }),
    state: Schema.Literals(["ROAMING", "SPAWNING"]),
    mapName: Schema.String,
    firstSeenAt: DateTimeString,
    lastSeenAt: DateTimeString,
    closedAt: Schema.NullOr(DateTimeString),
    detectedBy: MemberView,
    lastSeenBy: MemberView,
    claims: Schema.Array(Schema.Struct({ member: MemberView })),
  }),
);

const decodeOrganizationId = Schema.decodeUnknownOption(
  Schema.Struct({ guildId: Schema.NonEmptyString }),
);

type Options = {
  socket: GatewayClient;
  guilds: readonly { id: string; vanityUrl?: string | null }[] | undefined;
};

const touchesHeroSightings = (change: AccessPolicyChange) =>
  change.areas.includes("timers") || change.areas.includes("organization");

/** Keeps hero sighting boards and histories current from realtime updates. */
export const useHeroSightingsSocket = ({ socket, guilds }: Options) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const organizationIds = (guildId: string) => {
      const guild = guilds?.find((entry) => entry.id === guildId);

      return guild?.vanityUrl ? [guildId, guild.vanityUrl] : [guildId];
    };

    const refetch = (ids?: readonly string[]) => {
      const queries = heroSightingQueries(ids);

      void queryClient.cancelQueries(queries);
      void queryClient.invalidateQueries(queries);
    };

    // Revoked access hides what was shown at once, before the refetch answers.
    const clearRestricted = (ids?: readonly string[]) => {
      const queries = heroSightingQueries(ids);

      void queryClient.cancelQueries(queries);
      queryClient.removeQueries({ ...queries, type: "inactive" });
      queryClient.setQueriesData<HeroSightingResponseDto[]>(queries, []);
      void queryClient.invalidateQueries(queries);
    };

    const onUpdated = (payload: HeroSightingResponseDto) => {
      const sighting = decodeHeroSightingView(payload);

      if (Option.isNone(sighting)) {
        const guild = decodeOrganizationId(payload);

        refetch(
          Option.isSome(guild)
            ? organizationIds(guild.value.guildId)
            : undefined,
        );

        return;
      }

      writeHeroSightingToCache(
        queryClient,
        organizationIds(sighting.value.guildId),
        payload,
      );
    };

    const onPolicyChanges = (changes?: readonly AccessPolicyChange[]) => {
      if (!changes) {
        clearRestricted();

        return;
      }

      const restricted = changes.filter(
        (change) => change.restricted && touchesHeroSightings(change),
      );

      if (restricted.length > 0) {
        // If membership disappeared, its former alias may no longer be known.
        const allAliasesKnown = restricted.every((change) =>
          guilds?.some((guild) => guild.id === change.organizationId),
        );

        clearRestricted(
          allAliasesKnown
            ? restricted.flatMap((change) =>
                organizationIds(change.organizationId),
              )
            : undefined,
        );
      }

      if (
        changes.some(
          (change) => change.expanded && touchesHeroSightings(change),
        )
      )
        refetch();
    };

    const onPermissions = (payload: GatewayAccessUpdate) =>
      onPolicyChanges(payload.accessPolicyChanges);

    const onJoin = (payload: GatewayJoin) => {
      onPolicyChanges(payload.accessPolicyChanges);

      // Join confirms the subscription: HTTP recovers updates missed offline.
      if (payload.recover) refetch();
    };

    socket.on("hero-sighting.updated", onUpdated);
    socket.on("join", onJoin);
    socket.on("access.updated", onPermissions);

    return () => {
      socket.off("hero-sighting.updated", onUpdated);
      socket.off("join", onJoin);
      socket.off("access.updated", onPermissions);
    };
  }, [guilds, queryClient, socket]);
};
