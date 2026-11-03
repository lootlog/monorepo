import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { HeroSightingResponseDto } from "@lootlog/client/main";
import type { AccessPolicyChange } from "@lootlog/protocol/realtime/access-policy";
import { z } from "zod";
import { GatewayEvent } from "@/config/gateway";
import type { GatewayClient } from "@/lib/gateway-client";
import {
  heroSightingQueries,
  writeHeroSightingToCache,
} from "./hero-sighting-cache";

const memberView = z.object({
  memberId: z.number(),
  userId: z.string().nullable(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
});

// The gateway forwards the API's HeroSightingResponseDto. Validate the fields
// this view reads before putting an incremental payload in cache.
const heroSightingView = z.object({
  id: z.number(),
  guildId: z.string().min(1),
  world: z.string().min(1),
  hero: z.object({ key: z.string().min(1), name: z.string(), lvl: z.number() }),
  state: z.enum(["ROAMING", "SPAWNING"]),
  mapName: z.string(),
  firstSeenAt: z.iso.datetime(),
  lastSeenAt: z.iso.datetime(),
  closedAt: z.iso.datetime().nullable(),
  detectedBy: memberView,
  lastSeenBy: memberView,
  claims: z.array(z.object({ member: memberView })),
});

const organizationId = z.object({ guildId: z.string().min(1) });

type Options = {
  socket: GatewayClient;
  guilds: readonly { id: string; vanityUrl?: string | null }[] | undefined;
};

type PolicyUpdate = { accessPolicyChanges?: readonly AccessPolicyChange[] };

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
      const sighting = heroSightingView.safeParse(payload);

      if (!sighting.success) {
        const guild = organizationId.safeParse(payload);

        refetch(
          guild.success ? organizationIds(guild.data.guildId) : undefined,
        );

        return;
      }

      writeHeroSightingToCache(
        queryClient,
        organizationIds(sighting.data.guildId),
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

    const onPermissions = (payload?: PolicyUpdate) =>
      onPolicyChanges(payload?.accessPolicyChanges);

    const onJoin = (payload: PolicyUpdate & { recover: boolean }) => {
      onPolicyChanges(payload.accessPolicyChanges);

      // Join confirms the subscription: HTTP recovers updates missed offline.
      if (payload.recover) refetch();
    };

    socket.on(GatewayEvent.HERO_SIGHTING_UPDATED, onUpdated);
    socket.on(GatewayEvent.JOIN, onJoin);
    socket.on(GatewayEvent.PERMISSIONS_UPDATED, onPermissions);

    return () => {
      socket.off(GatewayEvent.HERO_SIGHTING_UPDATED, onUpdated);
      socket.off(GatewayEvent.JOIN, onJoin);
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, onPermissions);
    };
  }, [guilds, queryClient, socket]);
};
