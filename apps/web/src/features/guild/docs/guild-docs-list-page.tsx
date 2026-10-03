import { EmptyState } from "@/components/common/empty-state";
import { FilterBar } from "@/components/common/filter-bar";
import { SectionCard } from "@/components/common/section-card/section-card";
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
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import {
  Archive,
  FileText,
  FileX2,
  Plus,
  RotateCcw,
  SearchX,
  Trash2,
} from "lucide-react";

import { ScrollArea } from "@lootlog/ui/components/scroll-area";

import { SearchInput } from "@/components/ui/search-input";
import { GuildDocCreateDialog } from "./components/guild-doc-create-dialog";
import { GuildDocTrashDialog } from "./components/guild-doc-trash-dialog";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { GuildDocsGridSkeleton } from "./guild-docs-grid-skeleton";

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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{t("docs.list.title")}</h1>
      <div className="px-3 pt-3">
        <FilterBar ariaLabel={t("docs.list.toolbarLabel")}>
          <SearchInput
            name="guild-doc-search"
            aria-label={t("docs.list.searchLabel")}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t("docs.list.searchPlaceholder")}
            wrapperClassName="h-10 min-w-0 flex-1 basis-full sm:basis-48"
            disabled={documentsQuery.isLoading}
          />

          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
            <Badge
              variant="outline"
              className="mr-auto shrink-0 gap-1.5 sm:mr-0"
              aria-label={t("docs.list.limit", {
                max: limit.max,
                used: limit.used,
              })}
              title={t("docs.list.limit", {
                max: limit.max,
                used: limit.used,
              })}
            >
              <FileText className="size-3.5" aria-hidden="true" />
              {t("docs.list.limitShort", {
                max: limit.max,
                used: limit.used,
              })}
            </Badge>
            {canWrite && (
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0"
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
                className="h-10 shrink-0"
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
        </FilterBar>
      </div>

      <div className="flex min-h-0 flex-1 flex-col pt-3">
        {documentsQuery.isLoading ? (
          <GuildDocsGridSkeleton />
        ) : documentsQuery.isError ? (
          <div className="px-3 pb-3">
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
        ) : !hasDocuments ? (
          <div className="px-3 pb-3">
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
        ) : !hasFilteredDocuments ? (
          <div className="px-3 pb-3">
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
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="grid grid-cols-1 gap-3 px-3 pb-3 lg:grid-cols-2 xl:grid-cols-3">
              {filteredDocuments.map((document) => {
                const editorName =
                  document.updatedBy.name ?? t("docs.list.unknownEditor");

                return (
                  <SectionCard key={document.id} className="gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <TextLink
                          className="block truncate leading-tight text-sm"
                          render=<Link
                            to="/$guildId/docs/$docId"
                            params={{ guildId, docId: document.id }}
                          />
                        >
                          {document.title}
                        </TextLink>
                        <p className="text-xs text-muted-foreground">
                          {t("docs.list.updatedBy", { name: editorName })}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {t("docs.list.version", {
                          version: document.version,
                        })}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {timestampToDate(document.updatedAt)}
                    </p>
                    <div className="mt-1 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="min-w-0 flex-1 justify-center"
                        render={
                          <Link
                            to="/$guildId/docs/$docId"
                            params={{ guildId, docId: document.id }}
                          >
                            {t("docs.list.open")}
                          </Link>
                        }
                        nativeButton={false}
                      />
                      {canWrite && (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={deleteDocument.isPending}
                          aria-label={t("docs.trash.move")}
                          title={t("docs.trash.move")}
                          className="size-9 shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDocumentPendingTrash(document)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </SectionCard>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

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
