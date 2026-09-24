import type { ChatMessage } from "@/api/chat.api";
import { resolveNpcType } from "@lootlog/domain/npc-routing";
import {
  canReadPolicyNpc,
  diffAccessPolicies,
  type AccessPolicySnapshot,
  type OrganizationAccessPolicy,
} from "@lootlog/protocol/realtime/access-policy";
import type { QueryClient, Query } from "@tanstack/react-query";
import {
  getChatMessagesQueryGuildId,
  isChatMessagesQuery,
} from "./chat-query-cache.helpers";

const REFRESH_DELAY_MS = 5_000;

type ChatPolicyState = {
  policy?: AccessPolicySnapshot;
  pendingGuilds: Set<string>;
  timer?: ReturnType<typeof setTimeout>;
  refresh?: Promise<void>;
  refreshingGuilds?: ReadonlySet<string>;
  lastRefreshAt?: number;
  listeners: number;
};

const states = new WeakMap<QueryClient, ChatPolicyState>();

const getState = (queryClient: QueryClient) => {
  let state = states.get(queryClient);

  if (!state) {
    state = { pendingGuilds: new Set(), listeners: 0 };
    states.set(queryClient, state);
  }

  return state;
};

const scheduleRefresh = (
  queryClient: QueryClient,
  state: ChatPolicyState,
  immediate = false,
) => {
  if (state.pendingGuilds.size === 0) {
    clearTimeout(state.timer);
    state.timer = undefined;

    return;
  }

  if (state.refresh || (state.timer !== undefined && !immediate)) return;
  clearTimeout(state.timer);
  state.timer = undefined;

  const refresh = () => {
    const guildIds = new Set(state.pendingGuilds);
    state.pendingGuilds.clear();
    state.timer = undefined;

    const predicate = (query: Query) => {
      const guildId = getChatMessagesQueryGuildId(query);

      return guildId !== undefined && guildIds.has(guildId);
    };

    // An older response cannot cover this reconnect. Let it finish, then
    // reconcile once more instead of repeatedly cancelling HTTP requests.
    for (const query of queryClient.getQueryCache().findAll({ predicate })) {
      const guildId = getChatMessagesQueryGuildId(query);

      if (guildId && query.isActive() && query.state.fetchStatus === "fetching")
        state.pendingGuilds.add(guildId);
    }

    state.lastRefreshAt = Date.now();

    const request = queryClient.invalidateQueries(
      {
        predicate,
        refetchType: "active",
      },
      { cancelRefetch: false },
    );

    state.refresh = request;
    state.refreshingGuilds = guildIds;
    void request.then(() => {
      if (state.refresh !== request) return;
      state.refresh = undefined;
      state.refreshingGuilds = undefined;

      if (state.listeners > 0) scheduleRefresh(queryClient, state, true);
    });
  };

  const delay = immediate
    ? Math.max(
        0,
        (state.lastRefreshAt ?? -Infinity) + REFRESH_DELAY_MS - Date.now(),
      )
    : REFRESH_DELAY_MS;

  if (delay === 0) refresh();
  else state.timer = setTimeout(refresh, delay);
};

export const refreshChatAfterReconnect = (
  queryClient: QueryClient,
  guildIds: readonly string[],
) => {
  const state = getState(queryClient);
  const accessibleGuilds = new Set(guildIds);

  const predicate = (query: Query) => {
    const guildId = getChatMessagesQueryGuildId(query);

    return guildId !== undefined && accessibleGuilds.has(guildId);
  };

  for (const query of queryClient.getQueryCache().findAll({ predicate })) {
    const guildId = getChatMessagesQueryGuildId(query);

    if (guildId) state.pendingGuilds.add(guildId);
  }

  // Closed histories remain lazy, but must still catch up when opened.
  void queryClient.invalidateQueries({ predicate, refetchType: "none" });
  scheduleRefresh(queryClient, state, true);
};

export const retainChatAccessPolicy = (queryClient: QueryClient) => {
  const state = getState(queryClient);
  state.listeners += 1;

  return () => {
    state.listeners -= 1;

    if (state.listeners === 0) {
      clearTimeout(state.timer);
      state.timer = undefined;
      state.refresh = undefined;
      state.refreshingGuilds = undefined;
      state.lastRefreshAt = undefined;

      if (state.pendingGuilds.size > 0) {
        void queryClient.invalidateQueries({
          predicate: (query) => {
            const guildId = getChatMessagesQueryGuildId(query);

            return guildId !== undefined && state.pendingGuilds.has(guildId);
          },
          refetchType: "none",
        });
        state.pendingGuilds.clear();
      }
    }
  };
};

export const canReadChatMessage = (
  organization: OrganizationAccessPolicy | undefined,
  message: ChatMessage,
) => {
  if (!organization) return false;

  if (
    message.type !== "NPC" &&
    !(message.type === "PARTY_GATHERING" && message.npc)
  ) {
    return canReadPolicyNpc(organization, "chat", null);
  }

  const type = resolveNpcType(message.npc);

  if (!type || !message.npc) return false;

  return canReadPolicyNpc(organization, "chat", { type, lvl: message.npc.lvl });
};

const retainReadableRefreshes = (
  state: ChatPolicyState,
  restrictedGuilds: ReadonlySet<string>,
  organizations: ReadonlyMap<string, OrganizationAccessPolicy>,
) => {
  for (const guildId of restrictedGuilds) {
    const organization = organizations.get(guildId);

    const needsRefresh =
      state.pendingGuilds.has(guildId) || state.refreshingGuilds?.has(guildId);

    if (
      needsRefresh &&
      organization &&
      canReadPolicyNpc(organization, "chat", null)
    )
      state.pendingGuilds.add(guildId);
    else state.pendingGuilds.delete(guildId);
  }
};

/** One coordinator per cache: several mounted chat listeners must share refresh work. */
export const applyChatAccessPolicy = (
  queryClient: QueryClient,
  policy: AccessPolicySnapshot,
) => {
  const state = getState(queryClient);

  if (state.policy?.version === policy.version) return;
  const initial = state.policy === undefined;

  const changes = diffAccessPolicies(
    state.policy ?? { version: "", organizations: [] },
    policy,
  ).filter((change) => change.areas.includes("chat"));

  state.policy = policy;

  const restrictedGuilds = new Set(
    changes.flatMap((change) =>
      change.restricted ? [change.organizationId] : [],
    ),
  );

  const organizations = new Map(
    policy.organizations.map((organization) => [
      organization.organizationId,
      organization,
    ]),
  );

  const shouldReconcile = (query: {
    queryKey: readonly unknown[];
    state: { data: unknown; fetchStatus: string };
  }) => {
    const guildId = getChatMessagesQueryGuildId(query);

    return (
      guildId !== undefined &&
      (query.state.data !== undefined ||
        query.state.fetchStatus === "fetching") &&
      (initial || restrictedGuilds.has(guildId))
    );
  };

  const affectedQueries = new Set(
    queryClient.getQueryCache().findAll({ predicate: shouldReconcile }),
  );

  const affected = (query: Query) => affectedQueries.has(query);
  const interruptedUnloadedGuilds: string[] = [];

  for (const query of affectedQueries) {
    if (
      query.state.data !== undefined ||
      query.state.fetchStatus !== "fetching"
    )
      continue;
    const guildId = getChatMessagesQueryGuildId(query);

    if (!guildId) continue;
    const organization = organizations.get(guildId);

    if (organization && canReadPolicyNpc(organization, "chat", null))
      interruptedUnloadedGuilds.push(guildId);
  }

  // Cancellation reverts synchronously; prune after it so late responses cannot restore revoked rows.
  void queryClient.cancelQueries({ predicate: affected });
  queryClient.setQueriesData<ChatMessage[]>(
    { predicate: affected },
    (messages) => {
      if (!messages) return [];

      const visible = messages.filter((message) =>
        canReadChatMessage(organizations.get(message.guildId), message),
      );

      return visible.length === messages.length ? messages : visible;
    },
  );

  retainReadableRefreshes(state, restrictedGuilds, organizations);

  for (const change of changes) {
    if (change.expanded && !initial)
      state.pendingGuilds.add(change.organizationId);
  }

  for (const guildId of interruptedUnloadedGuilds)
    state.pendingGuilds.add(guildId);

  if (changes.length === 0) return;
  scheduleRefresh(queryClient, state, initial);
};

/** Old gateways cannot identify which cached rows were revoked. Purge once per burst and refetch through current server authorization. */
export const applyLegacyChatAccessChange = (queryClient: QueryClient) => {
  const state = getState(queryClient);
  state.policy = undefined;

  const queries = queryClient
    .getQueryCache()
    .findAll({ predicate: isChatMessagesQuery });

  void queryClient.cancelQueries({ predicate: isChatMessagesQuery });

  for (const query of queries) {
    const guildId = getChatMessagesQueryGuildId(query);

    if (guildId !== undefined) state.pendingGuilds.add(guildId);
  }

  queryClient.setQueriesData<ChatMessage[]>(
    { predicate: isChatMessagesQuery },
    [],
  );
  scheduleRefresh(queryClient, state);
};
