import { chunk } from "es-toolkit";
import { useGuildWorld } from "@/hooks/context/use-guild-world";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import { useViewMode } from "@/hooks/use-view-mode";
import {
  LOOTS_GRID_MEDIA_QUERY,
  LOOTS_VIEW_MODE_KEY,
} from "@/features/guild/loots-list/loots-list-layout";
import {
  useResetScrollTop,
  useVirtualInfiniteScroll,
} from "@/hooks/utils/use-virtual-infinite-scroll";
import {
  lootFromSnapshot,
  lootShareFromEvent,
  type Loot,
} from "@/lib/loots/loot-types";
import {
  useUsersControllerGetCurrentUserAccessibleGuilds,
  type LootPageResponseDto,
} from "@lootlog/client/main";
import {
  getLootQueryParams,
  lootListInfiniteQueryOptions,
} from "./loot-list-query";
import {
  applyLootSnapshots,
  clearLootPolicyData,
  lootMatchesListParams,
  patchLoot,
  reconcileActiveLootLists,
} from "./loot-list-cache";

import { createLootListReconciliation } from "./loot-list-reconciliation";

import { useGateway } from "@/hooks/utils/use-gateway";
import {
  getPageScroller,
  useDocumentScrollListener,
  usePageScrollsDocument,
  usePageVirtualizer,
} from "@/hooks/utils/use-page-scroll";
import { useThemedKey } from "@/themes/adapters";
import { findGuildByRouteId } from "@/lib/current-user-guilds";
import type {
  GuildLootCreatedEventV2,
  GuildLootShareUpdatedEventV2,
} from "@lootlog/protocol/loot-events";
import type { AccessPolicyChange } from "@lootlog/protocol/realtime/access-policy";
import type { LootSnapshotEvent } from "@lootlog/protocol/realtime";
import type { GatewayAccessUpdate, GatewayJoin } from "@/lib/gateway-client";
import {
  hashKey,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const GRID_COLUMNS = 2;

const EMPTY_LOOTS: Loot[] = [];

const EMPTY_GRID_ROWS: Loot[][] = [];

type LootsInfiniteData = InfiniteData<LootPageResponseDto>;

const getCurrentGuildId = (
  guilds: Array<{ id: string; vanityUrl?: string | null }> | undefined,
  guildId: string | undefined,
) => findGuildByRouteId(guilds, guildId)?.id ?? guildId;

const getLootPages = (loots: LootsInfiniteData | undefined) => loots?.pages;

const hasInitialLoots = (loots: LootsInfiniteData | undefined) =>
  (loots?.pages?.[0]?.items.length ?? 0) > 0;

const hasFetchedPage = (loots: LootsInfiniteData | undefined) =>
  (loots?.pages?.length ?? 0) > 0;

const useStableLootCollections = (pages: LootPageResponseDto[] | undefined) => {
  const allLoots = pages?.flatMap((page) => page.items) ?? EMPTY_LOOTS;

  if (allLoots.length === 0) {
    return { allLoots, gridRows: EMPTY_GRID_ROWS };
  }

  const gridRows = chunk(allLoots, GRID_COLUMNS);

  return { allLoots, gridRows };
};

export const useLiveLootList = () => {
  "use no memo";

  const { t } = useTranslation();
  const themedKey = useThemedKey();
  const guildId = useGuildId();
  const { world } = useGuildWorld();
  const { socket, connected } = useGateway();
  const queryClient = useQueryClient();
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();
  const { filters, hasActiveFilters, clearFilters } = useLootsFilters();

  const reconciliationRef = useRef<ReturnType<
    typeof createLootListReconciliation
  > | null>(null);

  const pendingReconciliationRef = useRef(false);

  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  );

  const currentGuildId = getCurrentGuildId(guilds, guildId);
  const lootQueryParams = getLootQueryParams(filters, world);

  const lootListQuery = lootListInfiniteQueryOptions(
    guildId ?? "",
    lootQueryParams,
  );

  const { queryKey } = lootListQuery;

  const queryIdentity = hashKey(queryKey);

  useResetScrollTop({
    getScrollElement: () => scrollElement,
    resetKey: queryIdentity,
  });

  const {
    data: loots,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isFetchingNextPage,
    isPlaceholderData,
    refetch,
  } = useInfiniteQuery({
    ...lootListQuery,
    enabled: !!guildId,
  });

  const scrollsDocument = usePageScrollsDocument();

  const scrolledToTop = () =>
    (getPageScroller(scrollElement, scrollsDocument)?.getScrollTop() ?? 0) < 1;

  const isScrolledToTop = useEffectEvent(scrolledToTop);

  const [pending, setPending] = useState<{
    organizationId?: string;
    loots: readonly Loot[];
  }>({ loots: EMPTY_LOOTS });

  const pendingLoots =
    pending.organizationId === currentGuildId ? pending.loots : EMPTY_LOOTS;

  const canPlaceLoots = () => {
    const state = queryClient.getQueryState<LootsInfiniteData>(queryKey);

    return (
      state?.fetchStatus === "idle" &&
      hasFetchedPage(state.data) &&
      scrolledToTop()
    );
  };

  const placeLoots = (placed: readonly Loot[]) => {
    if (guildId && applyLootSnapshots(queryClient, guildId, placed))
      reconciliationRef.current?.markDirty();
  };

  const handleLootShareUpdate = useEffectEvent(
    (payload: GuildLootShareUpdatedEventV2) => {
      if (!guildId || payload.guildId !== currentGuildId) return;
      const lootId = payload.lootId;
      const lootShare = lootShareFromEvent(payload.lootShare);
      patchLoot(queryClient, guildId, lootId, { lootShare });
      setPending((current) => ({
        ...current,
        loots: current.loots.map((loot) =>
          loot.id === lootId ? { ...loot, lootShare } : loot,
        ),
      }));
    },
  );

  const handleLootSnapshot = useEffectEvent((payload: LootSnapshotEvent) => {
    if (payload.guildId !== currentGuildId) return;

    if (!payload.loot) {
      reconciliationRef.current?.markDirty();

      return;
    }

    const loot = lootFromSnapshot(payload.loot);

    if (pendingLoots.length === 0 && canPlaceLoots()) {
      placeLoots([loot]);

      return;
    }

    setPending((current) => ({
      organizationId: payload.guildId,
      loots: [
        ...(current.organizationId === payload.guildId
          ? current.loots.filter((entry) => entry.id !== loot.id)
          : []),
        loot,
      ],
    }));
  });

  const clearRestrictedLoots = useEffectEvent(
    (organizationIds?: readonly string[]) => {
      const routes = organizationIds?.flatMap((id) => {
        const organization = guilds?.find((entry) => entry.id === id);
        const aliases = [id];

        if (organization?.vanityUrl) aliases.push(organization.vanityUrl);

        if (id === currentGuildId && guildId) aliases.push(guildId);

        return aliases;
      });

      const { organizationId } = pending;

      if (
        !organizationIds ||
        (organizationId && organizationIds.includes(organizationId))
      )
        setPending({ loots: EMPTY_LOOTS });

      return clearLootPolicyData(queryClient, routes);
    },
  );

  useEffect(() => {
    if (!guildId) return;

    const reconciliation = createLootListReconciliation({
      canRefresh: () =>
        connected &&
        document.visibilityState === "visible" &&
        isScrolledToTop(),
      refresh: () => reconcileActiveLootLists(queryClient, guildId),
    });

    reconciliationRef.current = reconciliation;

    if (pendingReconciliationRef.current) reconciliation.markDirty();

    const onLootCreate = (payload: GuildLootCreatedEventV2) => {
      if (payload.guildId === currentGuildId) reconciliation.markDirty();
    };

    const onLootShareUpdate = (payload: GuildLootShareUpdatedEventV2) => {
      handleLootShareUpdate(payload);
    };

    const onLootSnapshot = (payload: LootSnapshotEvent) => {
      handleLootSnapshot(payload);
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

    const onPermissions = (payload: GatewayAccessUpdate) => {
      revalidateAccess(
        payload.accessPolicyChanges
          ? restrictedOrganizations(payload.accessPolicyChanges)
          : undefined,
      );
    };

    const onJoin = (payload: GatewayJoin) => {
      const restricted = restrictedOrganizations(payload.accessPolicyChanges);

      if (
        guilds &&
        currentGuildId &&
        !payload.guildIds.includes(currentGuildId)
      ) {
        restricted.push(currentGuildId);
      }

      if (restricted.length > 0 || payload.recover)
        revalidateAccess(restricted);
    };

    const resume = () => reconciliation.resume();
    socket.on("join", onJoin);
    socket.on("access.updated", onPermissions);
    socket.on("loot.created", onLootCreate);
    socket.on("loot.share-updated", onLootShareUpdate);
    socket.on("loot.snapshot", onLootSnapshot);
    document.addEventListener("visibilitychange", resume);

    return () => {
      pendingReconciliationRef.current = reconciliation.isDirty();
      reconciliation.dispose();
      reconciliationRef.current = null;
      socket.off("join", onJoin);
      socket.off("access.updated", onPermissions);
      socket.off("loot.created", onLootCreate);
      socket.off("loot.share-updated", onLootShareUpdate);
      socket.off("loot.snapshot", onLootSnapshot);
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

  const { viewMode } = useViewMode(
    LOOTS_VIEW_MODE_KEY,
    "grid",
    LOOTS_GRID_MEDIA_QUERY,
  );

  const { allLoots, gridRows } = useStableLootCollections(getLootPages(loots));
  const totalCount = allLoots.length;

  const listRef = useRef<HTMLDivElement>(null);

  const listVirtualizer = usePageVirtualizer<HTMLDivElement>({
    count: totalCount + 1,
    scrollElement,
    listRef,
    getItemKey: (index) => allLoots[index]?.id ?? "loots-loader",
    estimateSize: () => 180,
    overscan: 5,
    useAnimationFrameWithResizeObserver: true,
    enabled: viewMode === "list",
  });

  const gridVirtualizer = usePageVirtualizer<HTMLDivElement>({
    count: gridRows.length + 1,
    scrollElement,
    listRef,
    getItemKey: (index) =>
      gridRows[index]?.map((loot) => loot.id).join(":") ?? "loots-loader",
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

  const placePendingLoots = () => {
    if (pendingLoots.length === 0 || !canPlaceLoots()) return;
    placeLoots(pendingLoots);
    setPending({ loots: EMPTY_LOOTS });
  };

  const handleListChange = useEffectEvent(placePendingLoots);

  useEffect(() => {
    const target = getPageScroller(scrollElement, scrollsDocument)?.eventTarget;
    const onScroll = () => handleListChange();

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === "updated" &&
        event.query.queryHash === queryIdentity &&
        (event.action.type === "error" ||
          (event.action.type === "success" && !event.action.manual))
      )
        handleListChange();
    });

    target?.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      unsubscribe();
      target?.removeEventListener("scroll", onScroll);
    };
  }, [queryClient, queryIdentity, scrollElement, scrollsDocument]);

  const resumeReconciliation = () => reconciliationRef.current?.resume();

  useDocumentScrollListener(resumeReconciliation);

  const newLootCount = pendingLoots.filter(
    (loot) =>
      !allLoots.some((entry) => entry.id === loot.id) &&
      lootMatchesListParams(loot, lootQueryParams) !== false,
  ).length;

  const showNewLoots = () => {
    getPageScroller(scrollElement, scrollsDocument)?.scrollTo({ top: 0 });
    placePendingLoots();
  };

  const hasLoots = hasInitialLoots(loots);

  const isRefreshing = isPlaceholderData && isFetching && !isFetchingNextPage;

  const isFailed = isError && !hasLoots;

  const isEmpty =
    !isError && !isPlaceholderData && hasFetchedPage(loots) && !hasLoots;

  const isPending = !isFailed && !hasLoots && !isEmpty;

  const retry = () => {
    void (hasLoots && hasNextPage ? fetchNextPage() : refetch());
  };

  return {
    queryIdentity,
    setScrollElement,
    listRef,
    isEmpty,
    isError,
    isFailed,
    isPending,
    isRefreshing,
    retry,
    viewMode,
    gridVirtualizer,
    gridVirtualItems,
    gridRows,
    hasNextPage,
    t,
    themedKey,
    resumeReconciliation,
    newLootCount,
    showNewLoots,
    virtualizer,
    virtualItems,
    totalCount,
    allLoots,
    world,
    hasActiveFilters,
    clearFilters,
  };
};
