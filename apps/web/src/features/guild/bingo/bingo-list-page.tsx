import { getBingoControllerListBoardsQueryOptions } from "@lootlog/client/main";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import { KillStatsSearch } from "@/components/common/kill-stats-search";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { RetryButton } from "@/components/common/retry-button";
import { ResultsSurface } from "@/components/common/results-surface";
import { ROUTES } from "@/config/routes";
import { canManageEvent } from "@/features/guild/events/utils/event-access";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { Button } from "@lootlog/ui/components/button";
import { EmptyState } from "@lootlog/ui/components/empty-state";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, Grid3x3, Plus, SearchX } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BingoCreateDialog } from "./bingo-create-dialog";
import { BingoListTile } from "./bingo-list-tile";
import { useBingoSocket } from "./use-bingo-socket";

export const BingoListPage = () => {
  const guildId = useGuildId() ?? "";
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: accessPolicy } = useGuildPermissions();
  const canManage = canManageEvent(accessPolicy);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  useBingoSocket({ guildId });

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    ...getBingoControllerListBoardsQueryOptions({ guildId }),
    enabled: Boolean(guildId),
  });

  const boards = data?.items ?? [];
  const normalizedSearch = searchValue.trim().toLocaleLowerCase();

  const filteredBoards = normalizedSearch
    ? boards.filter((board) =>
        board.name.toLocaleLowerCase().includes(normalizedSearch),
      )
    : boards;

  const createButton = canManage ? (
    <Button
      onClick={() => setCreateOpen(true)}
      icon={<Plus className="size-4" />}
    >
      {t("bingo.create")}
    </Button>
  ) : null;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <ListTileSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <div className="p-3">
          <EmptyState
            fill
            icon={AlertCircle}
            title={t("bingo.loadError")}
            description={t("bingo.loadErrorDescription")}
            action={
              <RetryButton
                onRetry={() => void refetch()}
                isRetrying={isFetching}
              />
            }
          />
        </div>
      );
    }

    if (boards.length === 0) {
      return (
        <div className="p-3">
          <EmptyState
            fill
            icon={Grid3x3}
            title={t("bingo.emptyTitle")}
            description={t("bingo.emptyDescription")}
            action={createButton}
          />
        </div>
      );
    }

    if (filteredBoards.length === 0) {
      return (
        <div className="p-3">
          <EmptyState
            fill
            icon={SearchX}
            title={t("bingo.noResults")}
            description={t("bingo.noResultsDescription")}
            action={<ClearFiltersButton onClear={() => setSearchValue("")} />}
          />
        </div>
      );
    }

    return filteredBoards.map((board) => (
      <BingoListTile
        key={board.id}
        guildId={guildId}
        board={board}
        canManage={canManage}
      />
    ));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{t("bingo.title")}</h1>
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        <ResultsSurface
          search={
            <KillStatsSearch
              value={searchValue}
              placeholder={t("bingo.filterPlaceholder")}
              onChange={setSearchValue}
            />
          }
          filters={
            canManage ? (
              <Button
                size="sm"
                className="shrink-0"
                onClick={() => setCreateOpen(true)}
                icon={<Plus className="size-4" />}
              >
                {t("bingo.create")}
              </Button>
            ) : null
          }
          filtersLabel={t("bingo.filterLabel")}
        >
          {renderContent()}
        </ResultsSurface>
      </ScrollArea>

      {canManage ? (
        <BingoCreateDialog
          guildId={guildId}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(boardId) => {
            void navigate({ to: ROUTES.guild.bingo.edit(guildId, boardId) });
          }}
        />
      ) : null}
    </div>
  );
};
