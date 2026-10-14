import { EmptyState } from "@/components/common/empty-state";
import { ListToolbar } from "@/components/common/list-toolbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@lootlog/ui/components/alert-dialog";
import { Button } from "@lootlog/ui/components/button";
import {
  Archive,
  FileText,
  FileX2,
  Plus,
  RotateCcw,
  SearchX,
} from "lucide-react";

import { ScrollArea } from "@lootlog/ui/components/scroll-area";

import { GuildDocCreateDialog } from "./components/guild-doc-create-dialog";
import { GuildDocTrashDialog } from "./components/guild-doc-trash-dialog";
import { GuildDocTile } from "./guild-doc-tile";
import { GuildDocTileSkeleton } from "./guild-doc-tile-skeleton";

import { useGuildDocsList } from "./use-guild-docs-list";

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
  } = useGuildDocsList();

  const toolbarActions = (
    <div className="flex items-center gap-2">
      {/* A readout, not a control: a button's height and shape without its border. */}
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
    if (documentsQuery.isLoading) {
      return (
        <div aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <GuildDocTileSkeleton key={index} hasActions={canWrite} />
          ))}
        </div>
      );
    }

    if (!hasDocuments) {
      return (
        <div className="p-3">
          <EmptyState
            framed
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
            framed
            icon={SearchX}
            title={t("docs.list.emptySearchTitle")}
            description={t("docs.list.emptySearchDescription")}
            action={
              <Button
                type="button"
                variant="outline"
                onClick={() => setSearchValue("")}
              >
                {t("docs.list.clearSearch")}
              </Button>
            }
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
            onTrash={() => setDocumentPendingTrash(document)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{t("docs.list.title")}</h1>
      {documentsQuery.isError ? (
        <div className="p-3">
          <EmptyState
            framed
            icon={FileX2}
            title={t("docs.list.loadError")}
            description={t("docs.list.loadErrorDescription")}
            action={
              <Button
                type="button"
                variant="outline"
                loading={documentsQuery.isFetching}
                icon=<RotateCcw className="size-3.5" />
                onClick={() => void documentsQuery.refetch()}
              >
                {t("common.actions.retry")}
              </Button>
            }
          />
        </div>
      ) : (
        <ScrollArea data-under-top-bar className="min-h-0 flex-1">
          <ListToolbar
            search={searchValue}
            onSearchChange={setSearchValue}
            placeholder={t("docs.list.filterPlaceholder")}
            label={t("docs.list.filterLabel")}
            clearLabel={t("docs.list.clearSearch")}
            disabled={documentsQuery.isLoading}
          >
            {toolbarActions}
          </ListToolbar>
          {renderContent()}
        </ScrollArea>
      )}

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
      <AlertDialog
        open={documentPendingTrash !== null}
        onOpenChange={(open) => {
          if (!open && !deleteDocument.isPending) {
            setDocumentPendingTrash(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("docs.trash.moveTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("docs.trash.moveDescription", {
                title: documentPendingTrash?.title ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDocument.isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              render=<Button
                variant="destructive"
                loading={deleteDocument.isPending}
              />
              disabled={deleteDocument.isPending || !documentPendingTrash}
              onClick={(event) => {
                event.preventBaseUIHandler();

                if (documentPendingTrash) {
                  void moveDocumentToTrash(documentPendingTrash);
                }
              }}
            >
              {t("docs.trash.move")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
