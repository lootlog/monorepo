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

const scheduleRefresh = (queryClient: QueryClient, state: ChatPolicyState) => {
  clearTimeout(state.timer);
  state.timer = undefined;
  if (state.pendingGuilds.size === 0) return;
  state.timer = setTimeout(() => {
    const guildIds = new Set(state.pendingGuilds);
    state.pendingGuilds.clear();
    state.timer = undefined;
    void queryClient.invalidateQueries(
      {
        predicate: (query) => {
          const guildId = getChatMessagesQueryGuildId(query);
          return guildId !== undefined && guildIds.has(guildId);
        },
        refetchType: "active",
      },
      { cancelRefetch: false },
    );
  }, REFRESH_DELAY_MS);
};

export const retainChatAccessPolicy = (queryClient: QueryClient) => {
  const state = getState(queryClient);
  state.listeners += 1;
  return () => {
    state.listeners -= 1;
    if (state.listeners === 0) {
      clearTimeout(state.timer);
      state.timer = undefined;
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
    changes
      .filter((change) => change.restricted)
      .map((change) => change.organizationId),
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
  const interruptedUnloadedGuilds = [...affectedQueries]
    .filter(
      (query) =>
        query.state.data === undefined &&
        query.state.fetchStatus === "fetching",
    )
    .map(getChatMessagesQueryGuildId)
    .filter((guildId): guildId is string => {
      if (!guildId) return false;
      const organization = organizations.get(guildId);
      return (
        organization !== undefined &&
        canReadPolicyNpc(organization, "chat", null)
      );
    });
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
  for (const guildId of restrictedGuilds) state.pendingGuilds.delete(guildId);
  for (const change of changes) {
    if (change.expanded && !initial)
      state.pendingGuilds.add(change.organizationId);
  }
  for (const guildId of interruptedUnloadedGuilds)
    state.pendingGuilds.add(guildId);
  if (changes.length === 0) return;
  scheduleRefresh(queryClient, state);
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
