import { Schema } from "effect";
import type { QueryClient, Query } from "@tanstack/react-query";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  type UserCurrentGuildResponseDtoOutput,
} from "@lootlog/client/main";
import {
  canReadPolicyNpc,
  diffAccessPolicies,
  type AccessPolicySnapshot,
  type AccessPolicyChange,
} from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import type { PermissionsUpdatedPayload } from "@/lib/socket";

const isQueryPath = Schema.is(Schema.String);

const isGuildQueryParams = Schema.is(Schema.Struct({ guildId: Schema.String }));

type TimerRecord = { guildId: string; npc: { type: string; lvl: number } };

const policies = new WeakMap<QueryClient, AccessPolicySnapshot>();

export const getGameAccessPolicy = (queryClient: QueryClient) =>
  policies.get(queryClient);

const filterTimers = <T extends TimerRecord>(
  rows: T[],
  policy: AccessPolicySnapshot,
): T[] => {
  const organizations = new Map(
    policy.organizations.map((organization) => [
      organization.organizationId,
      organization,
    ]),
  );

  const filtered = rows.filter((row) => {
    const organization = organizations.get(row.guildId);

    return (
      organization !== undefined &&
      canReadPolicyNpc(organization, "timers", row.npc)
    );
  });

  return filtered.length === rows.length ? rows : filtered;
};

export const applyGameTimerAccess = <T extends TimerRecord>(
  queryClient: QueryClient,
  rows: T[],
): T[] => {
  const policy = policies.get(queryClient);

  return policy ? filterTimers(rows, policy) : rows;
};

const filterOrganizations = (
  guilds: UserCurrentGuildResponseDtoOutput[],
  policy: AccessPolicySnapshot,
) => {
  const organizations = new Map(
    policy.organizations.map((organization) => [
      organization.organizationId,
      organization,
    ]),
  );

  return guilds.flatMap((guild) => {
    const organization = organizations.get(guild.id);

    if (!organization) return [];

    const hasLootlogAccess = organization.permissions.includes(
      Permission.LOOTLOG_ACCESS,
    );

    return guild.hasLootlogAccess === hasLootlogAccess &&
      !guild.isAccessDataStale
      ? guild
      : { ...guild, hasLootlogAccess, isAccessDataStale: false };
  });
};

export const applyGameOrganizationAccess = (
  queryClient: QueryClient,
  guilds: UserCurrentGuildResponseDtoOutput[],
) => {
  const policy = policies.get(queryClient);

  return policy ? filterOrganizations(guilds, policy) : guilds;
};

export const isOrganizationMetadataMissing = (
  policy: AccessPolicySnapshot | undefined,
  guilds: readonly { id: string }[],
): boolean => {
  const ids = new Set(guilds.map((guild) => guild.id));

  return (
    policy?.organizations.some(
      (organization) => !ids.has(organization.organizationId),
    ) ?? false
  );
};

export const getTimerQueryGuildId = (
  query: Query,
): string | null | undefined => {
  const [path, params] = query.queryKey;

  if (path === "/timers") return null;

  if (path === "/timers/history") {
    if (isGuildQueryParams(params)) return params.guildId;
  }

  if (isQueryPath(path))
    return /^\/guilds\/([^/]+)\/timers\/[^/]+\/history$/.exec(path)?.[1];

  return undefined;
};

const reconcileTimers = (
  queryClient: QueryClient,
  policy: AccessPolicySnapshot,
  changes: readonly AccessPolicyChange[] | undefined,
  initial: boolean,
  pendingQueries: Set<Query>,
) => {
  const timerChanges =
    changes?.filter((change) => change.areas.includes("timers")) ?? [];

  const restricted = new Set(
    timerChanges.flatMap((change) =>
      change.restricted ? [change.organizationId] : [],
    ),
  );

  const expanded = new Set(
    timerChanges.flatMap((change) =>
      change.expanded ? [change.organizationId] : [],
    ),
  );

  for (const query of queryClient.getQueryCache().getAll()) {
    const scope = getTimerQueryGuildId(query);

    if (scope === undefined) continue;

    const canReadScope = policy.organizations.some(
      (organization) =>
        (scope === null || scope === organization.organizationId) &&
        organization.permissions.includes(Permission.LOOTLOG_TIMERS_READ),
    );

    if (!canReadScope) pendingQueries.delete(query);

    if (
      initial ||
      (scope === null ? restricted.size > 0 : restricted.has(scope))
    ) {
      // The global timer reader filters its response against the latest policy
      // before caching it, so its first request can finish without restarting.
      const preserveInitialRequest = initial && scope === null && canReadScope;

      if (
        !preserveInitialRequest &&
        query.state.fetchStatus === "fetching" &&
        query.state.data === undefined &&
        canReadScope
      )
        pendingQueries.add(query);

      // Cancellation reverts an in-flight query before the policy filter runs.
      if (!preserveInitialRequest)
        void queryClient.cancelQueries({
          queryKey: query.queryKey,
          exact: true,
        });
      queryClient.setQueryData<TimerRecord[]>(query.queryKey, (rows) => {
        if (!rows) return preserveInitialRequest ? rows : [];

        return filterTimers(rows, policy);
      });
    }

    if (
      !initial &&
      canReadScope &&
      (scope === null ? expanded.size > 0 : expanded.has(scope))
    )
      pendingQueries.add(query);
  }
};

const reconcilePermissions = (
  queryClient: QueryClient,
  policy: AccessPolicySnapshot,
  changes: readonly AccessPolicyChange[] | undefined,
  initial: boolean,
) => {
  const organizations = new Map(
    policy.organizations.map((organization) => [
      organization.organizationId,
      organization,
    ]),
  );

  const changedIds = new Set(changes?.map((change) => change.organizationId));

  if (initial) {
    for (const organization of policy.organizations)
      changedIds.add(organization.organizationId);

    for (const query of queryClient.getQueryCache().getAll()) {
      const path = query.queryKey[0];

      const id = isQueryPath(path)
        ? /^\/guilds\/([^/]+)\/permissions$/.exec(path)?.[1]
        : undefined;

      if (id) changedIds.add(id);
    }
  }

  for (const id of changedIds) {
    const queryKey = getGuildsControllerGetGuildPermissionsQueryKey({
      guildId: id,
    });

    void queryClient.cancelQueries({ queryKey });
    // The event contains the authoritative effective permissions; no HTTP roundtrip.
    queryClient.setQueryData(queryKey, [
      ...(organizations.get(id)?.permissions ?? []),
    ]);
  }
};

const reconcileOrganizations = (
  queryClient: QueryClient,
  policy: AccessPolicySnapshot,
  changes: readonly AccessPolicyChange[] | undefined,
  initial: boolean,
  pendingQueries: Set<Query>,
) => {
  const guildsKey = getUsersControllerGetCurrentUserAccessibleGuildsQueryKey();

  const membershipChanged = changes?.some((change) =>
    change.areas.includes("organization"),
  );

  if (initial || membershipChanged) {
    const activeQuery = queryClient
      .getQueryCache()
      .find({ queryKey: guildsKey });

    if (!initial && activeQuery?.state.fetchStatus === "fetching")
      pendingQueries.add(activeQuery);

    if (!initial) void queryClient.cancelQueries({ queryKey: guildsKey });
    queryClient.setQueryData<UserCurrentGuildResponseDtoOutput[]>(
      guildsKey,
      (guilds) => (guilds ? filterOrganizations(guilds, policy) : guilds),
    );

    if (
      (initial &&
        activeQuery?.state.data !== undefined &&
        activeQuery.state.fetchStatus !== "fetching" &&
        isOrganizationMetadataMissing(
          policy,
          queryClient.getQueryData<UserCurrentGuildResponseDtoOutput[]>(
            guildsKey,
          ) ?? [],
        )) ||
      (!initial &&
        changes?.some(
          (change) => change.expanded && change.areas.includes("organization"),
        ))
    ) {
      const query = queryClient.getQueryCache().find({ queryKey: guildsKey });

      if (query) pendingQueries.add(query);
    }
  }
};

/** One coordinator for all timer worlds, history queries and organization metadata. */
export const createGameAccessCache = (queryClient: QueryClient) => {
  let currentPolicy: AccessPolicySnapshot | undefined;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  const pendingQueries = new Set<Query>();

  const scheduleRefresh = (immediate = false) => {
    if (pendingQueries.size === 0) return;
    clearTimeout(refreshTimer);

    const refresh = () => {
      refreshTimer = undefined;
      const pending = new Set(pendingQueries);
      pendingQueries.clear();
      void queryClient.invalidateQueries(
        { predicate: (query) => pending.has(query), refetchType: "active" },
        { cancelRefetch: false },
      );
    };

    if (immediate) refresh();
    else refreshTimer = setTimeout(refresh, 5000);
  };

  return {
    apply(data: PermissionsUpdatedPayload) {
      const policy = data.accessPolicy;

      if (!policy) {
        currentPolicy = undefined;
        policies.delete(queryClient);

        for (const query of queryClient.getQueryCache().getAll()) {
          if (getTimerQueryGuildId(query) === undefined) continue;
          void queryClient.cancelQueries({
            queryKey: query.queryKey,
            exact: true,
          });
          queryClient.setQueryData(query.queryKey, []);
          pendingQueries.add(query);
        }

        scheduleRefresh();

        return;
      }

      if (currentPolicy?.version === policy.version) return;
      const initial = currentPolicy === undefined;

      const changes = diffAccessPolicies(
        currentPolicy ?? { version: "", organizations: [] },
        policy,
      );

      currentPolicy = policy;
      policies.set(queryClient, policy);
      reconcileTimers(queryClient, policy, changes, initial, pendingQueries);
      reconcilePermissions(queryClient, policy, changes, initial);
      reconcileOrganizations(
        queryClient,
        policy,
        changes,
        initial,
        pendingQueries,
      );
      scheduleRefresh(initial);
    },
    dispose() {
      if (policies.get(queryClient) === currentPolicy)
        policies.delete(queryClient);
      clearTimeout(refreshTimer);
      void queryClient.invalidateQueries({
        predicate: (query) => pendingQueries.has(query),
        refetchType: "none",
      });
      pendingQueries.clear();
    },
  };
};
