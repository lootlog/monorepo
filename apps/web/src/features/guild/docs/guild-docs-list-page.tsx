import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, FileText, FileX2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Card } from "@lootlog/ui/components/card";
import { Input } from "@lootlog/ui/components/input";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  useDocsControllerDeleteDocument,
  useDocsControllerGetDocuments,
} from "@/lib/api/generated/main/docs/docs";
import type { GuildDocumentListResponseDtoItemsItem } from "@/lib/api/generated/main/model";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import {
  guildDocsListQueryOptions,
  invalidateGuildDocsQueries,
} from "./docs-api";
import { canManageGuildDocs, canWriteGuildDocs } from "./docs-permissions";
import { formatGuildDocDateTime } from "./docs-date-format";
import { GuildDocCreateDialog } from "./components/guild-doc-create-dialog";
import { GuildDocTrashDialog } from "./components/guild-doc-trash-dialog";
import { GuildDocsListSkeleton } from "./guild-docs-list-skeleton";
import { useTranslation } from "react-i18next";

export const GuildDocsListPage = () => {
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";
  const queryClient = useQueryClient();
  const { data: permissions } = useGuildPermissions();
  const [searchValue, setSearchValue] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [documentPendingTrash, setDocumentPendingTrash] =
    useState<GuildDocumentListResponseDtoItemsItem | null>(null);
  const documentsQuery = useDocsControllerGetDocuments(
    { guildId },
    {
      query: guildDocsListQueryOptions(guildId),
    },
  );
  const deleteDocument = useDocsControllerDeleteDocument();

  if (documentsQuery.isLoading) {
    return <GuildDocsListSkeleton />;
  }

  const documents = documentsQuery.data?.items ?? [];
  const normalizedSearch = searchValue.trim().toLocaleLowerCase("pl");
  const filteredDocuments = normalizedSearch
    ? documents.filter((document) =>
        document.title.toLocaleLowerCase("pl").includes(normalizedSearch),
      )
    : documents;
  const limit = documentsQuery.data?.limit ?? {
    canCreate: false,
    max: 50,
    trashed: 0,
    used: documents.length,
  };
  const canCreate = canWriteGuildDocs(permissions) && limit.canCreate;
  const canWrite = canWriteGuildDocs(permissions);
  const canManage = canManageGuildDocs(permissions);
  const emptyTitle =
    normalizedSearch && documents.length > 0
      ? t("docs.list.emptySearchTitle")
      : t("docs.list.emptyTitle");
  const emptyDescription =
    normalizedSearch && documents.length > 0
      ? t("docs.list.emptySearchDescription")
      : t("docs.list.emptyDescription");

  const moveDocumentToTrash = async (
    document: GuildDocumentListResponseDtoItemsItem,
  ) => {
    try {
      await deleteDocument.mutateAsync({
        pathParams: { guildId, docId: document.id },
      });
      await invalidateGuildDocsQueries(queryClient, guildId, document.id);
      setDocumentPendingTrash(null);
      toast.success(t("docs.trash.moved"));
    } catch {
      toast.error(t("docs.trash.moveError"));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background/50">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 px-3 py-3">
          <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
                  <FileText className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold leading-tight">
                    {t("docs.list.title")}
                  </h2>
                  <p className="text-xs leading-tight text-muted-foreground">
                    {t("docs.list.subtitle")}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Badge variant={limit.canCreate ? "secondary" : "destructive"}>
                  {t("docs.list.limit", {
                    max: limit.max,
                    used: limit.used,
                  })}
                </Badge>
                {canWrite && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full justify-center sm:w-auto"
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
                    className="w-full justify-center sm:w-auto"
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

            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="guild-doc-search"
                aria-label={t("docs.list.searchLabel")}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={t("docs.list.searchPlaceholder")}
                className="pl-9"
              />
            </div>
          </Card>

          {documentsQuery.isError ? (
            <Card className="flex flex-col items-center justify-center gap-3 border-border bg-card/40 py-12 backdrop-blur-sm">
              <FileX2 className="size-12 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                {t("docs.list.loadError")}
              </p>
            </Card>
          ) : filteredDocuments.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-3 border-border bg-card/40 py-12 text-center backdrop-blur-sm">
              <FileText className="size-12 text-muted-foreground opacity-50" />
              <div className="space-y-1">
                <p className="text-sm font-medium">{emptyTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {emptyDescription}
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {filteredDocuments.map((document) => {
                const editorName =
                  document.updatedBy.name ?? t("docs.list.unknownEditor");

                return (
                  <Card
                    key={document.id}
                    className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm transition-colors hover:bg-card/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <Link
                          to="/$guildId/docs/$docId"
                          params={{ guildId, docId: document.id }}
                          className="block truncate text-base font-semibold leading-tight outline-none hover:text-primary focus-visible:text-primary"
                        >
                          {document.title}
                        </Link>
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
                        asChild
                        size="sm"
                        variant="secondary"
                        className="min-w-0 flex-1 justify-center"
                      >
                        <Link
                          to="/$guildId/docs/$docId"
                          params={{ guildId, docId: document.id }}
                        >
                          {t("docs.list.open")}
                        </Link>
                      </Button>
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
          )}
        </div>
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
      <AlertDialog
        open={documentPendingTrash !== null}
        onOpenChange={(open) => {
          if (!open) {
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
              disabled={deleteDocument.isPending || !documentPendingTrash}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();

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
