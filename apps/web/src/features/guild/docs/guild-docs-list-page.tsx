import {
  SectionCard as Card,
  SectionCard,
} from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
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
import { Archive, FileText, FileX2, Plus, SearchX, Trash2 } from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lootlog/ui/components/empty";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";

import { SearchInput } from "@/components/ui/search-input";
import { GuildDocCreateDialog } from "./components/guild-doc-create-dialog";
import { GuildDocTrashDialog } from "./components/guild-doc-trash-dialog";
import { formatGuildDocDateTime } from "./docs-date-format";
import { GuildDocsListSkeleton } from "./guild-docs-list-skeleton";

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
    <div className="flex h-full min-h-0 flex-col bg-background">
      <h1 className="sr-only">{t("docs.list.title")}</h1>
      <div className="px-3 pt-3">
        <SectionCard className="rounded-xl">
          <SectionCardContent className="p-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchInput
                name="guild-doc-search"
                aria-label={t("docs.list.searchLabel")}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={t("docs.list.searchPlaceholder")}
                className="h-9"
                wrapperClassName="min-w-0 flex-1"
                disabled={documentsQuery.isLoading}
              />

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="ml-auto h-9 shrink-0 gap-1.5 rounded-md px-3 text-xs font-medium text-muted-foreground"
                  aria-label={t("docs.list.limit", {
                    max: limit.max,
                    used: limit.used,
                  })}
                  title={t("docs.list.limit", {
                    max: limit.max,
                    used: limit.used,
                  })}
                >
                  <FileText className="size-3.5" />
                  {t("docs.list.limitShort", {
                    max: limit.max,
                    used: limit.used,
                  })}
                </Badge>
                {canWrite && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 shrink-0"
                    onClick={() => setTrashOpen(true)}
                  >
                    <Archive className="size-3.5" />
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
                    className="h-9 shrink-0"
                    disabled={!limit.canCreate}
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="size-3.5" />
                    {limit.canCreate
                      ? t("docs.list.create")
                      : t("docs.list.limitReached")}
                  </Button>
                )}
              </div>
            </div>
          </SectionCardContent>
        </SectionCard>
      </div>

      <div className="flex min-h-0 flex-1 flex-col pt-3">
        {documentsQuery.isLoading ? (
          <GuildDocsListSkeleton />
        ) : documentsQuery.isError ? (
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-3 pb-3 md:[align-items:safe_center]">
            <Card className="flex flex-col items-center justify-center gap-3 border-border bg-card py-12">
              <FileX2 className="size-12 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                {t("docs.list.loadError")}
              </p>
            </Card>
          </div>
        ) : !hasDocuments ? (
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-3 pb-3 md:[align-items:safe_center]">
            <Empty className="min-h-56 w-full max-w-xl">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText />
                </EmptyMedia>
                <EmptyTitle>{t("docs.list.emptyTitle")}</EmptyTitle>
                <EmptyDescription>
                  {t("docs.list.emptyDescription")}
                </EmptyDescription>
              </EmptyHeader>
              {canCreate && (
                <EmptyContent>
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4" />
                    {t("docs.list.create")}
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          </div>
        ) : !hasFilteredDocuments ? (
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-3 pb-3 md:[align-items:safe_center]">
            <Empty className="min-h-56 w-full max-w-xl">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>{t("docs.list.emptySearchTitle")}</EmptyTitle>
                <EmptyDescription>
                  {t("docs.list.emptySearchDescription")}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchValue("")}
                >
                  {t("docs.list.clearSearch")}
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="grid grid-cols-1 gap-3 px-3 pb-3 lg:grid-cols-2 xl:grid-cols-3">
              {filteredDocuments.map((document) => {
                const editorName =
                  document.updatedBy.name ?? t("docs.list.unknownEditor");

                return (
                  <Card
                    key={document.id}
                    className="gap-3 border-border bg-card p-4  transition-colors hover:bg-card"
                  >
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
                      {formatGuildDocDateTime(document.updatedAt)}
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
                          className="size-8 shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDocumentPendingTrash(document)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </Card>
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
              render=<Button loading={deleteDocument.isPending} />
              disabled={deleteDocument.isPending || !documentPendingTrash}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
