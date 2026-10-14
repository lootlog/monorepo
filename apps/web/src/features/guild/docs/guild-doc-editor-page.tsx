import { EmptyState } from "@/components/common/empty-state";
import { MetaItem } from "@/components/common/meta-item";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
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
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import {
  Clock3,
  FileX2,
  History,
  LockKeyhole,
  PenLine,
  Trash2,
} from "lucide-react";
import { GuildDocHistoryDialog } from "./components/guild-doc-history-dialog";
import { GuildDocEditor } from "./editor/guild-doc-editor";
import { GUILD_DOC_COLUMN_CLASS } from "./guild-doc-column";
import { GuildDocEditorSkeleton } from "./guild-doc-editor-skeleton";
import { TITLE_MAX_LENGTH, useGuildDocDraft } from "./use-guild-doc-draft";

export const GuildDocEditorPage = () => {
  const {
    title,
    document,
    t,
    canWrite,
    setHistoryOpen,
    deleteDocument,
    setTrashConfirmOpen,
    saveDraft,
    setTitle,
    docId,
    editorSeed,
    content,
    setContent,
    isDirty,
    updateDocument,
    resetDraft,
    guildId,
    historyOpen,
    trashConfirmOpen,
    moveDocumentToTrash,
    documentQuery,
  } = useGuildDocDraft();

  if (documentQuery.isLoading) {
    return <GuildDocEditorSkeleton />;
  }

  if (documentQuery.isError || !document) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-3 py-3">
            <EmptyState
              framed
              icon={FileX2}
              title={t("docs.editor.loadError")}
              description={t("docs.editor.loadErrorDescription")}
              action={
                documentQuery.isError ? (
                  <Button
                    type="button"
                    variant="outline"
                    loading={documentQuery.isFetching}
                    onClick={() => void documentQuery.refetch()}
                  >
                    {t("common.actions.retry")}
                  </Button>
                ) : undefined
              }
            />
          </div>
        </ScrollArea>
      </div>
    );
  }

  const editorName = document.updatedBy.name ?? t("docs.list.unknownEditor");

  const toolbarActions = (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t("docs.editor.history")}
              className="text-muted-foreground"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="size-4" />
            </Button>
          }
        />
        <TooltipContent side="bottom">
          {t("docs.editor.history")}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t("docs.trash.move")}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              disabled={deleteDocument.isPending}
              onClick={() => setTrashConfirmOpen(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          }
        />
        <TooltipContent side="bottom">{t("docs.trash.move")}</TooltipContent>
      </Tooltip>
    </>
  );

  const header = (
    <header
      className={cn("flex flex-col gap-2 pt-6 pb-4", GUILD_DOC_COLUMN_CLASS)}
    >
      {canWrite ? (
        <>
          <h1 className="sr-only">{document.title}</h1>
          {/* The title reads as the document's heading; the padding keeps its focus ring off the text. */}
          <input
            id="guild-doc-editor-title"
            name="guild-doc-editor-title"
            value={title}
            maxLength={TITLE_MAX_LENGTH}
            aria-label={t("docs.editor.titleLabel")}
            placeholder={t("docs.editor.titlePlaceholder")}
            onChange={(event) => setTitle(event.target.value)}
            className="-mx-2 h-10 min-w-0 rounded-md bg-transparent px-2 text-2xl font-semibold outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </>
      ) : (
        <h1 className="flex min-h-10 items-center text-2xl font-semibold break-words">
          {document.title}
        </h1>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <MetaItem icon={PenLine} label={t("docs.list.editorLabel")}>
          {editorName}
        </MetaItem>
        <MetaItem icon={Clock3} label={t("docs.list.updatedAtLabel")}>
          {timestampToDate(document.updatedAt)}
        </MetaItem>
        <MetaItem icon={History}>
          {t("docs.list.version", { version: document.version })}
        </MetaItem>
        {!canWrite && (
          <MetaItem icon={LockKeyhole}>{t("docs.editor.readOnly")}</MetaItem>
        )}
      </div>
    </header>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        <form className="flex min-h-full flex-col" onSubmit={saveDraft}>
          <GuildDocEditor
            key={`${docId}-${editorSeed}`}
            className="flex-1"
            contentClassName={cn("flex-1 pb-24", GUILD_DOC_COLUMN_CLASS)}
            content={content}
            editable={canWrite}
            header={header}
            namespace={`guild-doc-${docId}-${editorSeed}`}
            toolbarActions={toolbarActions}
            onChange={setContent}
          />

          <UnsavedChangesBar
            isDirty={isDirty}
            isSubmitting={updateDocument.isPending}
            onReset={resetDraft}
          />
        </form>
      </ScrollArea>

      {canWrite && (
        <GuildDocHistoryDialog
          docId={docId}
          guildId={guildId}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        />
      )}
      {canWrite && (
        <AlertDialog
          open={trashConfirmOpen}
          onOpenChange={(open) => {
            if (!deleteDocument.isPending) setTrashConfirmOpen(open);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("docs.trash.moveTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("docs.trash.moveDescription", {
                  title: document.title,
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
                disabled={deleteDocument.isPending}
                onClick={(event) => {
                  event.preventBaseUIHandler();
                  void moveDocumentToTrash();
                }}
              >
                {t("docs.trash.move")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};
