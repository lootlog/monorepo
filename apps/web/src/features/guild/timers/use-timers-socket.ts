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
import { DateTimeString } from "@lootlog/schema/http-scalars";
import { Option, Schema } from "effect";
import { GatewayEvent } from "@/config/gateway";
import type { GatewayClient } from "@/lib/gateway-client";

const timerIdentityFields = {
  guildId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  timerKey: Schema.NonEmptyString,
};

const decodeTimerIdentity = Schema.decodeUnknownOption(
  Schema.Struct(timerIdentityFields),
);

// The authenticated gateway forwards the API's TimerResponseDto. Validate the
// fields consumed by this view before putting an incremental payload in cache.
const isTimerView = Schema.is(
  Schema.Struct({
    ...timerIdentityFields,
    minSpawnTime: DateTimeString,
    maxSpawnTime: DateTimeString,
    npc: Schema.Struct({
      id: Schema.Finite,
      name: Schema.String,
      lvl: Schema.Finite,
      prof: Schema.String,
      type: Schema.String,
      icon: Schema.NullOr(Schema.String),
    }),
    member: Schema.optional(Schema.Struct({ name: Schema.String })),
    entranceClosesAt: Schema.optional(Schema.NullOr(DateTimeString)),
  }),
);

type Options = {
  socket: GatewayClient;
  guilds: readonly { id: string; vanityUrl?: string | null }[] | undefined;
};

type PolicyUpdate = { accessPolicyChanges?: readonly AccessPolicyChange[] };

const isTimerPath = Schema.is(
  Schema.String.check(Schema.isPattern(/^\/guilds\/[^/]+\/timers$/)),
);

const decodeTimerParameters = Schema.decodeUnknownOption(
  Schema.UndefinedOr(Schema.Struct({ world: Schema.optional(Schema.String) })),
);

export const useTimersSocket = ({ socket, guilds }: Options) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const allTimers = {
      predicate: (query: { queryKey: readonly unknown[] }) =>
        isTimerPath(query.queryKey[0]),
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
      const decodedIdentity = decodeTimerIdentity(payload);

      if (Option.isNone(decodedIdentity)) return;

      const identity = decodedIdentity.value;
      const paths = organizationPaths(identity.guildId);

      for (const [queryKey] of queryClient.getQueriesData<TimerResponseDto[]>({
        predicate: (query) => {
          const parameters = decodeTimerParameters(query.queryKey[1]);

          return (
            paths.some((path) => path === query.queryKey[0]) &&
            Option.isSome(parameters) &&
            (!parameters.value?.world ||
              parameters.value.world === identity.world)
          );
        },
      })) {
        const query = { queryKey, exact: true };

        if (timer && !isTimerView(timer)) {
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

        // A patch changes one timer; the rest of the list, and the expiries it
        // already reflects, still date from the last HTTP snapshot.
        queryClient.setQueryData<TimerResponseDto[]>(
          queryKey,
          (old) =>
            timer
              ? upsertTimerInCollection(old, timer)
              : removeTimerFromCollection(old, identity),
          { updatedAt: state?.dataUpdatedAt },
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

    const onJoin = (
      payload: PolicyUpdate & { guildIds: string[]; recover: boolean },
    ) => {
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
      if (payload.recover) reconcile();
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
