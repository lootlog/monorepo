import { EmptyState } from "@lootlog/ui/components/empty-state";
import { ResultsSurface } from "@/components/common/results-surface";
import { KillStatsSearch } from "@/components/common/kill-stats-search";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import { Button } from "@lootlog/ui/components/button";
import { AlertCircle, Archive, FileText, Plus, SearchX } from "lucide-react";

import { ScrollArea } from "@lootlog/ui/components/scroll-area";

import { GuildDocCreateDialog } from "./components/guild-doc-create-dialog";
import { GuildDocTrashDialog } from "./components/guild-doc-trash-dialog";
import { GuildDocTile } from "./guild-doc-tile";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";

import { useGuildDocsList } from "./use-guild-docs-list";
import { RetryButton } from "@/components/common/retry-button";

export const GuildDocsListPage = () => {
  const {
    t,
    searchValue,
    setSearchValue,
    documentsQuery,
    limit,
    canWrite,
    setTrashOpen,
    canCreate,
    setCreateOpen,
    hasDocuments,
    hasFilteredDocuments,
    filteredDocuments,
    guildId,
    deleteDocument,
    setDocumentPendingTrash,
    createOpen,
    canManage,
    trashOpen,
    documentPendingTrash,
    moveDocumentToTrash,
    requestTrash,
  } = useGuildDocsList();

  const toolbarActions = (
    <div className="flex items-center gap-2">
      <span
        title={t("docs.list.limit", { max: limit.max, used: limit.used })}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 text-sm font-semibold tabular-nums text-muted-foreground"
      >
        <FileText className="size-4" aria-hidden="true" />
        <span aria-hidden="true">
          {t("docs.list.limitShort", { max: limit.max, used: limit.used })}
        </span>
        <span className="sr-only">
          {t("docs.list.limit", { max: limit.max, used: limit.used })}
        </span>
      </span>
      {canWrite && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setTrashOpen(true)}
        >
          <Archive className="size-4" aria-hidden="true" />
          {limit.trashed > 0
            ? t("docs.trash.openWithCount", {
                count: limit.trashed,
              })
            : t("docs.trash.open")}
        </Button>
      )}
      {canWrite && (
        <Button
          size="sm"
          className="shrink-0"
          disabled={!limit.canCreate}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" aria-hidden="true" />
          {limit.canCreate
            ? t("docs.list.create")
            : t("docs.list.limitReached")}
        </Button>
      )}
    </div>
  );

  const renderContent = () => {
    if (documentsQuery.isError) {
      return (
        <div className="p-3">
          <EmptyState
            fill
            icon={AlertCircle}
            title={t("docs.list.loadError")}
            description={t("docs.list.loadErrorDescription")}
            action={
              <RetryButton
                onRetry={() => documentsQuery.refetch()}
                isRetrying={documentsQuery.isFetching}
              />
            }
          />
        </div>
      );
    }

    if (documentsQuery.isLoading) {
      return (
        <div aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <ListTileSkeleton key={index} actions={canWrite ? 1 : 0} />
          ))}
        </div>
      );
    }

    if (!hasDocuments) {
      return (
        <div className="p-3">
          <EmptyState
            fill
            icon={FileText}
            title={t("docs.list.emptyTitle")}
            description={t("docs.list.emptyDescription")}
            action={
              canCreate ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" aria-hidden="true" />
                  {t("docs.list.create")}
                </Button>
              ) : undefined
            }
          />
        </div>
      );
    }

    if (!hasFilteredDocuments) {
      return (
        <div className="p-3">
          <EmptyState
            fill
            icon={SearchX}
            title={t("docs.list.emptySearchTitle")}
            description={t("docs.list.emptySearchDescription")}
            action={<ClearFiltersButton onClear={() => setSearchValue("")} />}
          />
        </div>
      );
    }

    return (
      <div>
        {filteredDocuments.map((document) => (
          <GuildDocTile
            key={document.id}
            guildId={guildId}
            document={document}
            canWrite={canWrite}
            trashDisabled={deleteDocument.isPending}
            onTrash={() => requestTrash(document)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{t("docs.list.title")}</h1>
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        <ResultsSurface
          search={
            <KillStatsSearch
              value={searchValue}
              placeholder={t("docs.list.filterPlaceholder")}
              onChange={setSearchValue}
            />
          }
          filters={toolbarActions}
          filtersLabel={t("docs.list.filterLabel")}
        >
          {renderContent()}
        </ResultsSurface>
      </ScrollArea>

      <GuildDocCreateDialog
        canCreate={canCreate}
        guildId={guildId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      {canWrite && (
        <GuildDocTrashDialog
          canManage={canManage}
          guildId={guildId}
          open={trashOpen}
          onOpenChange={setTrashOpen}
        />
      )}
      <ConfirmDialog
        open={documentPendingTrash !== null}
        onOpenChange={(open) => {
          if (!open) setDocumentPendingTrash(null);
        }}
        title={t("docs.trash.moveTitle")}
        description={t("docs.trash.moveDescription", {
          title: documentPendingTrash?.title ?? "",
        })}
        confirmButtonLabel={t("docs.trash.move")}
        cancelButtonLabel={t("common.cancel")}
        pending={deleteDocument.isPending}
        onConfirm={async () => {
          if (!documentPendingTrash) return;

          if (!(await moveDocumentToTrash(documentPendingTrash))) {
            throw new Error("The document did not reach the trash.");
          }
        }}
      />
    </div>
  );
};
