import { useEffect, useState } from "react";
import { Clock3, FileClock } from "lucide-react";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import {
  getDocsControllerGetHistoryQueryKey,
  getDocsControllerGetHistorySnapshotQueryKey,
  useDocsControllerGetHistory,
  useDocsControllerGetHistorySnapshot,
} from "@lootlog/client/main";
import type { GuildDocumentHistoryResponseDtoItemsItem } from "@lootlog/client/main";
import { GuildDocEditor } from "../editor/guild-doc-editor";
import { normalizeGuildDocEditorContent } from "../editor/guild-doc-editor-content";
import { formatGuildDocDateTime } from "../docs-date-format";
import { useTranslation } from "react-i18next";

type GuildDocHistoryDialogProps = {
  docId: string;
  guildId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const GuildDocHistoryDialog = ({
  docId,
  guildId,
  open,
  onOpenChange,
}: GuildDocHistoryDialogProps) => {
  const { t } = useTranslation();
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null,
  );
  const historyQuery = useDocsControllerGetHistory(
    { guildId, docId },
    {
      query: {
        enabled: open,
        queryKey: getDocsControllerGetHistoryQueryKey({ guildId, docId }),
      },
    },
  );
  const historyItems = historyQuery.data?.items ?? [];

  useEffect(() => {
    if (!open) {
      setSelectedHistoryId(null);
      return;
    }

    if (!selectedHistoryId && historyItems[0]) {
      setSelectedHistoryId(historyItems[0].id);
    }
  }, [historyItems, open, selectedHistoryId]);

  const snapshotQuery = useDocsControllerGetHistorySnapshot(
    {
      guildId,
      docId,
      historyId: selectedHistoryId ?? "",
    },
    {
      query: {
        enabled: open && Boolean(selectedHistoryId),
        queryKey: getDocsControllerGetHistorySnapshotQueryKey({
          guildId,
          docId,
          historyId: selectedHistoryId ?? "",
        }),
      },
    },
  );

  const renderHistoryButton = (
    history: GuildDocumentHistoryResponseDtoItemsItem,
  ) => {
    const actorName = history.actor.name ?? t("docs.list.unknownEditor");
    const actionLabel = t(`docs.history.actions.${history.action}`);
    const isSelected = history.id === selectedHistoryId;
    const editedAt = formatGuildDocDateTime(history.editedAt);

    return (
      <button
        key={history.id}
        type="button"
        className={cn(
          "group relative w-full rounded-md border px-2.5 py-1.5 text-left transition-colors",
          isSelected
            ? "border-primary/80 bg-primary/10"
            : "border-border/80 bg-card/35 hover:border-primary/40 hover:bg-card",
        )}
        aria-label={t("docs.history.version", { version: history.version })}
        title={history.title}
        onClick={() => setSelectedHistoryId(history.id)}
      >
        {isSelected && (
          <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-primary" />
        )}
        <div className="flex items-center justify-between gap-2 pl-1">
          <span className="truncate text-sm font-medium leading-tight">
            {t("docs.history.version", { version: history.version })}
          </span>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {editedAt}
          </span>
        </div>
        <p className="mt-1 truncate pl-1 text-[11px] text-muted-foreground">
          {t("docs.history.editedBy", {
            action: actionLabel,
            name: actorName,
          })}
        </p>
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="flex h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none flex-col gap-0 overflow-hidden border-border/70 bg-background/95 p-0 shadow-2xl shadow-background/40  sm:max-w-none lg:h-[min(92vh,860px)] lg:max-h-[min(92vh,860px)] xl:w-[1200px]"
      >
        <DialogHeader className="shrink-0 border-b border-border/70 bg-card px-4 py-3 pr-12  sm:px-5">
          <DialogTitle className="flex items-center gap-2 px-0 pt-0 text-base sm:text-lg">
            <span className="rounded-xl bg-primary/10 p-2">
              <FileClock className="size-4 text-primary" />
            </span>
            {t("docs.history.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-rows-[220px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)] lg:grid-rows-1">
          <aside className="min-h-0 border-b border-border/70 bg-card/25 lg:border-b-0 lg:border-r">
            <div className="flex h-11 items-center justify-between border-b border-border/70 px-3">
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("docs.history.versions")}
              </span>
              <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                {historyItems.length}
              </Badge>
            </div>
            <ScrollArea className="h-[calc(100%-2.75rem)]">
              <div className="flex flex-col gap-1 p-2">
                {historyQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full rounded-md" />
                  ))
                ) : historyQuery.isError ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    {t("docs.history.loadError")}
                  </p>
                ) : historyItems.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    {t("docs.history.empty")}
                  </p>
                ) : (
                  historyItems.map(renderHistoryButton)
                )}
              </div>
            </ScrollArea>
          </aside>

          <section className="flex min-h-0 flex-col bg-background">
            {snapshotQuery.isLoading ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
                <Skeleton className="h-14 w-full rounded-md" />
                <Skeleton className="min-h-0 flex-1 rounded-md" />
              </div>
            ) : snapshotQuery.data ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-card/20 px-4 py-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold">
                      {snapshotQuery.data.title}
                    </h3>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="size-3" />
                      {t("docs.history.preview", {
                        version: snapshotQuery.data.version,
                      })}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-background">
                    {t(`docs.history.actions.${snapshotQuery.data.action}`)}
                  </Badge>
                </div>
                <div className="flex min-h-0 flex-1 p-3">
                  <GuildDocEditor
                    key={snapshotQuery.data.id}
                    content={normalizeGuildDocEditorContent(
                      snapshotQuery.data.content,
                    )}
                    editable={false}
                    namespace={`guild-doc-history-${snapshotQuery.data.id}`}
                    className="min-h-0 flex-1 border-border/80 bg-card/20"
                  />
                </div>
              </div>
            ) : (
              <p className="p-3 text-sm text-muted-foreground">
                {t("docs.history.empty")}
              </p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
