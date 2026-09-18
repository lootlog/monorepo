import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getTimersControllerGetTimersQueryKey,
  type TimerResponseDto,
} from "@lootlog/client/main";
import {
  removeTimerFromCollection,
  upsertTimerInCollection,
  type TimerIdentity,
} from "@lootlog/domain/timers";
import type { AccessPolicyChange } from "@lootlog/protocol/realtime/access-policy";
import { z } from "zod";
import { GatewayEvent } from "@/config/gateway";
import type { GatewayClient } from "@/lib/gateway-client";

const timerIdentity = z.object({
  guildId: z.string().min(1),
  world: z.string().min(1),
  timerKey: z.string().min(1),
});

// The authenticated gateway forwards the API's TimerResponseDto. Validate the
// fields consumed by this view before putting an incremental payload in cache.
const timerView = timerIdentity.extend({
  minSpawnTime: z.iso.datetime(),
  maxSpawnTime: z.iso.datetime(),
  npc: z.object({
    id: z.number(),
    name: z.string(),
    lvl: z.number(),
    prof: z.string(),
    type: z.string(),
    icon: z.string().nullable(),
  }),
  member: z.object({ name: z.string() }).optional(),
});

type Options = {
  socket: GatewayClient;
  guilds: readonly { id: string; vanityUrl?: string | null }[] | undefined;
};

type PolicyUpdate = { accessPolicyChanges?: readonly AccessPolicyChange[] };

const timerPath = z.string().regex(/^\/guilds\/[^/]+\/timers$/);

const timerParameters = z.object({ world: z.string().optional() }).optional();

export const useTimersSocket = ({ socket, guilds }: Options) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const allTimers = {
      predicate: (query: { queryKey: readonly unknown[] }) =>
        timerPath.safeParse(query.queryKey[0]).success,
    };

    const organizationPaths = (guildId: string) => {
      const guild = guilds?.find((entry) => entry.id === guildId);
      const ids = guild?.vanityUrl ? [guildId, guild.vanityUrl] : [guildId];

      return ids.map(
        (id) => getTimersControllerGetTimersQueryKey({ guildId: id })[0],
      );
    };

    const reconcile = () => {
      void queryClient.cancelQueries(allTimers);
      void queryClient.invalidateQueries(allTimers);
    };

    const update = (payload: TimerIdentity, timer?: TimerResponseDto) => {
      const identity = timerIdentity.safeParse(payload);

      if (!identity.success) return;

      const paths = organizationPaths(identity.data.guildId);

      for (const [queryKey] of queryClient.getQueriesData<TimerResponseDto[]>({
        predicate: (query) => {
          const parameters = timerParameters.safeParse(query.queryKey[1]);

          return (
            paths.some((path) => path === query.queryKey[0]) &&
            parameters.success &&
            (!parameters.data?.world ||
              parameters.data.world === identity.data.world)
          );
        },
      })) {
        const query = { queryKey, exact: true };

        if (timer && !timerView.safeParse(timer).success) {
          void queryClient.cancelQueries(query);
          void queryClient.invalidateQueries(query);
          continue;
        }

        const state = queryClient.getQueryState(queryKey);

        const needsSnapshot =
          state?.data === undefined || state.fetchStatus === "fetching";

        // Cancellation reverts synchronously before the patch; a late HTTP
        // snapshot cannot overwrite the delivered event or a permission reset.
        if (needsSnapshot) void queryClient.cancelQueries(query);

        queryClient.setQueryData<TimerResponseDto[]>(queryKey, (old) =>
          timer
            ? upsertTimerInCollection(old, timer)
            : removeTimerFromCollection(old, identity.data),
        );

        if (needsSnapshot) void queryClient.invalidateQueries(query);
      }
    };

    const clearRestrictedTimers = (organizationIds?: readonly string[]) => {
      const paths = organizationIds?.flatMap(organizationPaths);

      const filters = {
        predicate: (query: { queryKey: readonly unknown[] }) =>
          allTimers.predicate(query) &&
          (!paths || paths.some((path) => path === query.queryKey[0])),
      };

      void queryClient.cancelQueries(filters);
      queryClient.removeQueries({ ...filters, type: "inactive" });
      queryClient.setQueriesData<TimerResponseDto[]>(filters, []);
      void queryClient.invalidateQueries(filters);
    };

    const onPermissions = (payload?: PolicyUpdate) => {
      const changes = payload?.accessPolicyChanges;

      if (!changes) {
        clearRestrictedTimers();

        return;
      }

      const restricted = changes.filter(
        (change) =>
          change.restricted &&
          (change.areas.includes("timers") ||
            change.areas.includes("organization")),
      );

      if (restricted.length > 0) {
        // If membership disappeared, its former alias may no longer be known.
        const allAliasesKnown = restricted.every((change) =>
          guilds?.some((guild) => guild.id === change.organizationId),
        );

        clearRestrictedTimers(
          allAliasesKnown
            ? restricted.map((change) => change.organizationId)
            : undefined,
        );
      }

      if (
        changes.some(
          (change) =>
            change.expanded &&
            (change.areas.includes("timers") ||
              change.areas.includes("organization")),
        )
      )
        reconcile();
    };

    const onJoin = (payload: PolicyUpdate & { guildIds: string[] }) => {
      const joinedGuilds = new Set(payload.guildIds);

      if (
        !payload.accessPolicyChanges ||
        payload.accessPolicyChanges.some(
          (change) =>
            change.restricted &&
            (change.areas.includes("timers") ||
              change.areas.includes("organization")),
        ) ||
        guilds?.some((guild) => !joinedGuilds.has(guild.id))
      ) {
        clearRestrictedTimers();

        return;
      }

      // Join confirms the new subscription: HTTP recovers events missed offline.
      reconcile();
    };

    const onCreate = (payload: TimerResponseDto) => update(payload, payload);
    const onDelete = (payload: TimerIdentity) => update(payload);

    socket.on(GatewayEvent.TIMERS_CREATE, onCreate);
    socket.on(GatewayEvent.TIMERS_DELETE, onDelete);
    socket.on(GatewayEvent.JOIN, onJoin);
    socket.on(GatewayEvent.PERMISSIONS_UPDATED, onPermissions);

    return () => {
      socket.off(GatewayEvent.TIMERS_CREATE, onCreate);
      socket.off(GatewayEvent.TIMERS_DELETE, onDelete);
      socket.off(GatewayEvent.JOIN, onJoin);
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, onPermissions);
    };
  }, [guilds, queryClient, socket]);
};
