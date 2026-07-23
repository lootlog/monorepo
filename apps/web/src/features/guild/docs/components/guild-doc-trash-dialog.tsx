import { ArchiveRestore, FileX2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import {
  useDocsControllerGetTrash,
  useDocsControllerPurgeDocument,
  useDocsControllerRestoreDocument,
} from "@lootlog/api-client/react-query/main/docs";
import {
  guildDocsTrashQueryOptions,
  invalidateGuildDocsQueries,
} from "../docs-api";
import { formatGuildDocDateTime } from "../docs-date-format";
import { useTranslation } from "react-i18next";

type GuildDocTrashDialogProps = {
  canManage: boolean;
  guildId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const GuildDocTrashDialog = ({
  canManage,
  guildId,
  open,
  onOpenChange,
}: GuildDocTrashDialogProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const trashQuery = useDocsControllerGetTrash(
    { guildId },
    {
      query: {
        ...guildDocsTrashQueryOptions(guildId),
        enabled: open,
      },
    },
  );
  const restoreDocument = useDocsControllerRestoreDocument();
  const purgeDocument = useDocsControllerPurgeDocument();
  const trashItems = trashQuery.data?.items ?? [];
  const isMutating = restoreDocument.isPending || purgeDocument.isPending;

  const refreshDocs = async (docId?: string) => {
    await invalidateGuildDocsQueries(queryClient, guildId, docId);
  };

  const handleRestore = async (docId: string) => {
    try {
      await restoreDocument.mutateAsync({
        pathParams: { guildId, docId },
      });
      await refreshDocs(docId);
      toast.success(t("docs.trash.restored"));
    } catch {
      toast.error(t("docs.trash.restoreError"));
    }
  };

  const handlePurge = async (docId: string) => {
    try {
      await purgeDocument.mutateAsync({
        pathParams: { guildId, docId },
      });
      await refreshDocs(docId);
      toast.success(t("docs.trash.purged"));
    } catch {
      toast.error(t("docs.trash.purgeError"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden border-border/70 bg-background/95 p-0 shadow-2xl shadow-background/40 backdrop-blur-xl sm:max-w-2xl">
        <DialogHeader className="border-b border-border/70 bg-card/50 px-4 py-3 pr-12">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="rounded-xl bg-destructive/10 p-2 shadow-inner shadow-destructive/10">
              <Trash2 className="size-4 text-destructive" />
            </span>
            {t("docs.trash.title")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {canManage
              ? t("docs.trash.descriptionAdmin")
              : t("docs.trash.descriptionWriter")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-2 p-3">
            {trashQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-md" />
              ))
            ) : trashQuery.isError ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <FileX2 className="size-10 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  {t("docs.trash.loadError")}
                </p>
              </div>
            ) : trashItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <ArchiveRestore className="size-10 text-muted-foreground opacity-50" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {t("docs.trash.emptyTitle")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("docs.trash.emptyDescription")}
                  </p>
                </div>
              </div>
            ) : (
              trashItems.map((document) => {
                const deletedByName =
                  document.deletedBy.name ?? t("docs.list.unknownEditor");
                const deletedAt = formatGuildDocDateTime(document.deletedAt);

                return (
                  <div
                    key={document.id}
                    className="flex flex-col gap-3 rounded-md border border-border/80 bg-card/35 p-3 transition-colors hover:bg-card/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">
                          {document.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className="h-5 shrink-0 px-1.5 text-[10px]"
                        >
                          {t("docs.list.version", {
                            version: document.version,
                          })}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("docs.trash.deletedBy", {
                          date: deletedAt,
                          name: deletedByName,
                        })}
                      </p>
                    </div>

                    {canManage && (
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={isMutating}
                          onClick={() => void handleRestore(document.id)}
                        >
                          <RotateCcw className="size-3.5" />
                          {t("docs.trash.restore")}
                        </Button>
                        <ConfirmDeleteDialog
                          disabled={isMutating}
                          title={t("docs.trash.purgeTitle")}
                          description={t("docs.trash.purgeDescription", {
                            title: document.title,
                          })}
                          confirmText={document.title}
                          confirmLabel={t("docs.trash.purgeConfirmLabel", {
                            title: document.title,
                          })}
                          confirmButtonLabel={t("docs.trash.purge")}
                          cancelButtonLabel={t("common.cancel")}
                          onConfirm={() => handlePurge(document.id)}
                          trigger={
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                              {t("docs.trash.purge")}
                            </Button>
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
