import { z } from "zod";
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

const queryPathSchema = z.string();
const guildQueryParamsSchema = z.object({ guildId: z.string() });

type TimerRecord = { guildId: string; npc: { type: string; lvl: number } };
const timerScope = (query: Query): string | null | undefined => {
  const [path, params] = query.queryKey;
  if (path === "/timers") return null;
  if (path === "/timers/history") {
    const parsedParams = guildQueryParamsSchema.safeParse(params);
    if (parsedParams.success) return parsedParams.data.guildId;
  }
  const parsedPath = queryPathSchema.safeParse(path);
  if (parsedPath.success)
    return /^\/guilds\/([^/]+)\/timers\/[^/]+\/history$/.exec(
      parsedPath.data,
    )?.[1];
  return undefined;
};

const reconcileTimers = (
  queryClient: QueryClient,
  policy: AccessPolicySnapshot,
  changes: readonly AccessPolicyChange[] | undefined,
  initial: boolean,
  pendingQueries: Set<Query>,
) => {
  const organizations = new Map(
    policy.organizations.map((organization) => [
      organization.organizationId,
      organization,
    ]),
  );
  const timerChanges =
    changes?.filter((change) => change.areas.includes("timers")) ?? [];
  const restricted = new Set(
    timerChanges
      .filter((change) => change.restricted)
      .map((change) => change.organizationId),
  );
  const expanded = new Set(
    timerChanges
      .filter((change) => change.expanded)
      .map((change) => change.organizationId),
  );
  for (const query of queryClient.getQueryCache().getAll()) {
    const scope = timerScope(query);
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
      if (
        query.state.fetchStatus === "fetching" &&
        query.state.data === undefined &&
        canReadScope
      )
        pendingQueries.add(query);
      // Cancellation reverts an in-flight query before the policy filter runs.
      void queryClient.cancelQueries({ queryKey: query.queryKey, exact: true });
      queryClient.setQueryData<TimerRecord[]>(query.queryKey, (rows) => {
        if (!rows) return [];
        const filtered = rows.filter((row) => {
          if (!initial && !restricted.has(row.guildId)) return true;
          const organization = organizations.get(row.guildId);
          return (
            organization !== undefined &&
            canReadPolicyNpc(organization, "timers", row.npc)
          );
        });
        return filtered.length === rows.length ? rows : filtered;
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
const reconcileOrganizations = (
  queryClient: QueryClient,
  policy: AccessPolicySnapshot,
  changes: readonly AccessPolicyChange[] | undefined,
  initial: boolean,
  pendingQueries: Set<Query>,
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
      const path = queryPathSchema.safeParse(query.queryKey[0]);
      const id = path.success
        ? /^\/guilds\/([^/]+)\/permissions$/.exec(path.data)?.[1]
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
  const guildsKey = getUsersControllerGetCurrentUserAccessibleGuildsQueryKey();
  const membershipChanged = changes?.some((change) =>
    change.areas.includes("organization"),
  );
  if (initial || membershipChanged) {
    const activeQuery = queryClient
      .getQueryCache()
      .find({ queryKey: guildsKey });
    if (activeQuery?.state.fetchStatus === "fetching")
      pendingQueries.add(activeQuery);
    void queryClient.cancelQueries({ queryKey: guildsKey });
    queryClient.setQueryData<UserCurrentGuildResponseDtoOutput[]>(
      guildsKey,
      (guilds) =>
        guilds
          ?.filter((guild) => organizations.has(guild.id))
          .map((guild) => {
            const organization = organizations.get(guild.id);
            const hasLootlogAccess =
              organization?.permissions.includes(Permission.LOOTLOG_ACCESS) ??
              false;
            return guild.hasLootlogAccess === hasLootlogAccess &&
              !guild.isAccessDataStale
              ? guild
              : { ...guild, hasLootlogAccess, isAccessDataStale: false };
          }),
    );
    if (
      !initial &&
      changes?.some(
        (change) => change.expanded && change.areas.includes("organization"),
      )
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
        for (const query of queryClient.getQueryCache().getAll()) {
          if (timerScope(query) === undefined) continue;
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
      reconcileTimers(queryClient, policy, changes, initial, pendingQueries);
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
      clearTimeout(refreshTimer);
      void queryClient.invalidateQueries({
        predicate: (query) => pendingQueries.has(query),
        refetchType: "none",
      });
      pendingQueries.clear();
    },
  };
};
