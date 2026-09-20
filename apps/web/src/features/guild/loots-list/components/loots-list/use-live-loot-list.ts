import { chunk } from "es-toolkit";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import { useViewMode } from "@/hooks/use-view-mode";
import { LOOTS_VIEW_MODE_KEY } from "@/features/guild/loots-list/loots-list-layout";
import {
  useResetScrollTop,
  useVirtualInfiniteScroll,
} from "@/hooks/utils/use-virtual-infinite-scroll";
import type { Loot } from "@/lib/loots/loot-types";
import {
  getLootsControllerFetchLootByIdQueryKey,
  getLootsControllerFetchLootsByGuildIdQueryKey,
  lootsControllerFetchLootsByGuildId,
  useUsersControllerGetCurrentUserAccessibleGuilds,
  type LootsControllerFetchLootsByGuildIdParams,
} from "@lootlog/client/main";
import {
  LOOTS_QUERY_GC_TIME_MS,
  reconcileActiveLootLists,
  clearLootPolicyData,
} from "./loot-list-cache";

import { createLootListReconciliation } from "./loot-list-reconciliation";

import { GatewayEvent } from "@/config/gateway";
import { useGateway } from "@/hooks/utils/use-gateway";
import { useThemedKey } from "@/themes";
import type {
  GuildLootCreatedEventV2,
  GuildLootShareUpdatedEventV2,
} from "@lootlog/schema/loot-events";
import type { AccessPolicyChange } from "@lootlog/protocol/realtime/access-policy";
import {
  hashKey,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useEffectEvent, useRef } from "react";
import { useTranslation } from "react-i18next";

const LOOTS_PAGE_LIMIT = 20;

const LOOTS_QUERY_STALE_TIME_MS = 30_000;

const GRID_COLUMNS = 2;

const EMPTY_LOOTS: Loot[] = [];

const EMPTY_GRID_ROWS: Loot[][] = [];

type LootsInfiniteData = InfiniteData<Loot[]>;

type LootFilters = ReturnType<typeof useLootsFilters>["filters"];

const parseOptionalNumber = (value: string) =>
  value.length > 0 ? Number(value) : undefined;

const optionalValues = <Value>(values: Value[]) =>
  values.length > 0 ? values : undefined;

const optionalText = (value: string | null | undefined) =>
  value ? value : undefined;

const getLootQueryParams = (
  filters: LootFilters,
  world: string | null | undefined,
): LootsControllerFetchLootsByGuildIdParams => ({
  limit: LOOTS_PAGE_LIMIT,
  npcs: optionalValues(filters.npcs),
  npcTypes: optionalValues(filters.npcTypes),
  rarities: optionalValues(filters.rarities),
  professions: optionalValues(filters.professions),
  players: optionalValues(filters.players),
  npcLevelMin: parseOptionalNumber(filters.npcLevelMin),
  npcLevelMax: parseOptionalNumber(filters.npcLevelMax),
  itemLevelMin: parseOptionalNumber(filters.itemLevelMin),
  itemLevelMax: parseOptionalNumber(filters.itemLevelMax),
  playerLevelMin: parseOptionalNumber(filters.playerLevelMin),
  playerLevelMax: parseOptionalNumber(filters.playerLevelMax),
  search: optionalText(filters.search),
  hid: optionalText(filters.hid),
  itemNames: optionalValues(filters.itemNames),
  world: optionalText(world),
});

const getCurrentGuildId = (
  guilds: Array<{ id: string; vanityUrl?: string | null }> | undefined,
  guildId: string | undefined,
) =>
  guilds?.find((guild) => guild.id === guildId || guild.vanityUrl === guildId)
    ?.id ?? guildId;

const getLootPages = (loots: LootsInfiniteData | undefined) => loots?.pages;

const hasInitialLoots = (loots: LootsInfiniteData | undefined) =>
  (loots?.pages?.[0]?.length ?? 0) > 0;

const useStableLootCollections = (pages: Loot[][] | undefined) => {
  const allLoots = pages?.flatMap((page) => page) ?? EMPTY_LOOTS;

  if (allLoots.length === 0) {
    return { allLoots, gridRows: EMPTY_GRID_ROWS };
  }

  const gridRows = chunk(allLoots, GRID_COLUMNS);

  return { allLoots, gridRows };
};

export const useLiveLootList = () => {
  const { t } = useTranslation();
  const themedKey = useThemedKey();
  const guildId = useGuildId();
  const { world } = useGuildContext();
  const { socket, connected } = useGateway();
  const queryClient = useQueryClient();
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();
  const { filters, hasActiveFilters, clearFilters } = useLootsFilters();

  const reconciliationRef = useRef<ReturnType<
    typeof createLootListReconciliation
  > | null>(null);

  const scrollElementRef = useRef<HTMLDivElement>(null);

  const currentGuildId = getCurrentGuildId(guilds, guildId);
  const lootQueryParams = getLootQueryParams(filters, world);

  const queryKey = guildId
    ? getLootsControllerFetchLootsByGuildIdQueryKey(
        { guildId },
        lootQueryParams,
      )
    : ["loots", "missing-guild"];

  const queryIdentity = hashKey(queryKey);

  const {
    data: loots,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    isPlaceholderData,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => {
      if (!guildId) {
        return Promise.resolve(EMPTY_LOOTS);
      }

      return lootsControllerFetchLootsByGuildId(
        { guildId },
        {
          ...lootQueryParams,
          cursor: pageParam > 0 ? pageParam : undefined,
        },
        { signal },
      );
    },
    getNextPageParam: (lastPage) =>
      lastPage.length === LOOTS_PAGE_LIMIT
        ? lastPage[lastPage.length - 1]?.id
        : undefined,
    initialPageParam: 0,
    enabled: !!guildId && !!world,
    staleTime: LOOTS_QUERY_STALE_TIME_MS,
    gcTime: LOOTS_QUERY_GC_TIME_MS,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const handleLootShareUpdate = useEffectEvent(
    (payload: GuildLootShareUpdatedEventV2) => {
      if (!guildId || payload.guildId !== currentGuildId) return;
      // A cached detail can be patched without fetching an unseen loot.
      queryClient.setQueryData<Loot | null>(
        getLootsControllerFetchLootByIdQueryKey({
          guildId,
          lootId: payload.lootId,
        }),
        (old) => (old ? { ...old, lootShare: payload.lootShare } : old),
      );
      reconciliationRef.current?.markDirty();
    },
  );

  const clearRestrictedLoots = useEffectEvent(
    (organizationIds?: readonly string[]) => {
      const routes = organizationIds?.flatMap((id) => {
        const organization = guilds?.find((entry) => entry.id === id);
        const aliases = [id];

        if (organization?.vanityUrl) aliases.push(organization.vanityUrl);

        if (id === currentGuildId && guildId) aliases.push(guildId);

        return aliases;
      });

      return clearLootPolicyData(queryClient, routes);
    },
  );

  useEffect(() => {
    if (!guildId || !world) return;

    const reconciliation = createLootListReconciliation({
      canRefresh: () =>
        connected &&
        document.visibilityState === "visible" &&
        (scrollElementRef.current?.scrollTop ?? 0) < 1,
      // Reconciliation happens only at the top; scrolling follows fresh cursors.
      refresh: () => reconcileActiveLootLists(queryClient, guildId),
    });

    reconciliationRef.current = reconciliation;
    // Reconcile missed events on connection changes, including initial connect.
    reconciliation.markDirty();

    const onLootCreate = (payload: GuildLootCreatedEventV2) => {
      if (payload.guildId === currentGuildId) reconciliation.markDirty();
    };

    const onLootShareUpdate = (payload: GuildLootShareUpdatedEventV2) => {
      handleLootShareUpdate(payload);
    };

    const restrictedOrganizations = (changes: readonly AccessPolicyChange[]) =>
      changes.flatMap((change) =>
        change.restricted && change.areas.includes("loots")
          ? [change.organizationId]
          : [],
      );

    const revalidateAccess = (organizationIds?: readonly string[]) => {
      if (organizationIds?.length === 0) {
        reconciliation.markDirty();

        return;
      }

      void clearRestrictedLoots(organizationIds).then(() => {
        if (
          organizationIds === undefined ||
          (currentGuildId && organizationIds.includes(currentGuildId))
        )
          reconciliation.markDirty();
      });
    };

    const onPermissions = (payload?: {
      accessPolicyChanges?: readonly AccessPolicyChange[];
    }) => {
      revalidateAccess(
        payload?.accessPolicyChanges
          ? restrictedOrganizations(payload.accessPolicyChanges)
          : undefined,
      );
    };

    const onJoin = (payload: {
      guildIds: string[];
      accessPolicyChanges?: readonly AccessPolicyChange[];
    }) => {
      const restricted = restrictedOrganizations(
        payload.accessPolicyChanges ?? [],
      );

      // Until guilds load, currentGuildId may still be the route's alias.
      if (
        guilds &&
        currentGuildId &&
        !payload.guildIds.includes(currentGuildId)
      ) {
        restricted.push(currentGuildId);
      }

      revalidateAccess(restricted);
    };

    const resume = () => reconciliation.resume();
    socket.on(GatewayEvent.CONNECT, reconciliation.markDirty);
    socket.on(GatewayEvent.JOIN, onJoin);
    socket.on(GatewayEvent.PERMISSIONS_UPDATED, onPermissions);
    socket.on(GatewayEvent.LOOTS_CREATE, onLootCreate);
    socket.on(GatewayEvent.LOOTS_SHARE_UPDATE, onLootShareUpdate);
    document.addEventListener("visibilitychange", resume);

    return () => {
      reconciliation.dispose();
      reconciliationRef.current = null;
      socket.off(GatewayEvent.CONNECT, reconciliation.markDirty);
      socket.off(GatewayEvent.JOIN, onJoin);
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, onPermissions);
      socket.off(GatewayEvent.LOOTS_CREATE, onLootCreate);
      socket.off(GatewayEvent.LOOTS_SHARE_UPDATE, onLootShareUpdate);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [
    connected,
    currentGuildId,
    guilds,
    guildId,
    queryClient,
    socket,
    world,
    queryIdentity,
  ]);

  const { viewMode } = useViewMode(LOOTS_VIEW_MODE_KEY);
  const { allLoots, gridRows } = useStableLootCollections(getLootPages(loots));
  const totalCount = allLoots.length;

  const listVirtualizer = useVirtualizer({
    count: totalCount + 1,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 180,
    overscan: 5,
    useAnimationFrameWithResizeObserver: true,
    enabled: viewMode === "list",
  });

  const gridVirtualizer = useVirtualizer({
    count: gridRows.length + 1,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 220,
    overscan: 3,
    useAnimationFrameWithResizeObserver: true,
    enabled: viewMode === "grid",
  });

  const listVirtualItems = listVirtualizer.getVirtualItems();
  const gridVirtualItems = gridVirtualizer.getVirtualItems();
  const virtualizer = viewMode === "grid" ? gridVirtualizer : listVirtualizer;
  const virtualItems = virtualizer.getVirtualItems();

  useVirtualInfiniteScroll({
    enabled: viewMode === "list",
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage: isFetching,
    itemCount: totalCount,
    virtualItems: listVirtualItems,
  });
  useVirtualInfiniteScroll({
    enabled: viewMode === "grid",
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage: isFetching,
    itemCount: gridRows.length,
    virtualItems: gridVirtualItems,
  });
  useResetScrollTop({
    resetKey: guildId ?? "",
    scrollElementRef,
  });

  const hasLoots = hasInitialLoots(loots);

  // New filters keep the previous page on screen while the next one loads;
  // background reconciliation refetches the same key and stays silent.
  const isRefreshing = isPlaceholderData && isFetching && !isFetchingNextPage;

  return {
    scrollElementRef,
    isLoading,
    isRefreshing,
    viewMode,
    gridVirtualizer,
    gridVirtualItems,
    gridRows,
    hasNextPage,
    t,
    themedKey,
    resumeReconciliation: () => reconciliationRef.current?.resume(),
    virtualizer,
    virtualItems,
    totalCount,
    allLoots,
    world,
    hasLoots,
    hasActiveFilters,
    clearFilters,
  };
};
