import { EmptyState } from "@/components/common/empty-state";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { MetaItem } from "@/components/common/meta-item";
import { HeaderSlotPortal } from "@/components/layout/header-slot-portal";
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
import { GuildDocTitleField } from "./components/guild-doc-title-field";
import { GuildDocEditor } from "./editor/guild-doc-editor";
import { GUILD_DOC_COLUMN_CLASS } from "./guild-doc-column";
import { GuildDocEditorSkeleton } from "./guild-doc-editor-skeleton";
import {
  GUILD_DOC_FORM_ID,
  TITLE_MAX_LENGTH,
  useGuildDocDraft,
} from "./use-guild-doc-draft";

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
              fill
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

  const lastEdit = t("docs.editor.lastEdit", {
    name: document.updatedBy.name ?? t("docs.list.unknownEditor"),
    date: timestampToDate(document.updatedAt),
  });

  const updatedAt = (
    <MetaItem icon={Clock3} label={t("docs.list.updatedAtLabel")}>
      {timestampToDate(document.updatedAt)}
    </MetaItem>
  );

  const version = (
    <MetaItem icon={History}>
      {t("docs.list.version", { version: document.version })}
    </MetaItem>
  );

  // The details close the toolbar where it has room; the editor shows on hover.
  const toolbarActions = (
    <>
      <span title={lastEdit} className="mr-2 hidden items-center gap-3 xl:flex">
        <span className="sr-only">{lastEdit}</span>
        {updatedAt}
        {version}
      </span>
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

  const readerDetails = (
    <>
      <MetaItem icon={PenLine} label={t("docs.list.editorLabel")}>
        {document.updatedBy.name ?? t("docs.list.unknownEditor")}
      </MetaItem>
      {updatedAt}
      {version}
    </>
  );

  // Readers get no formatting toolbar: a bar in its place says why and shows
  // the details the toolbar would end with.
  const readerBar = !canWrite && (
    <div
      data-list-tile
      className={cn(
        "sticky top-(--page-sticky-top) z-10 flex min-h-12 flex-wrap items-center gap-x-4 gap-y-1 py-2 backdrop-blur-sm",
        LIST_TILE_RULE_CLASS,
        LIST_TILE_INSET_CLASS,
      )}
    >
      <span className="flex h-8 items-center gap-2 text-sm text-muted-foreground">
        <LockKeyhole aria-hidden="true" className="size-4 shrink-0" />
        {/* Phones keep the lock alone, so the details fit beside it. */}
        <span className="max-sm:sr-only">{t("docs.editor.readOnly")}</span>
      </span>
      <span className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
        {readerDetails}
      </span>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{document.title}</h1>
      {canWrite && (
        <HeaderSlotPortal slot="title">
          <GuildDocTitleField
            form={GUILD_DOC_FORM_ID}
            value={title}
            onChange={setTitle}
            label={t("docs.editor.titleLabel")}
            placeholder={t("docs.editor.titlePlaceholder")}
            maxLength={TITLE_MAX_LENGTH}
          />
        </HeaderSlotPortal>
      )}
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        <form
          id={GUILD_DOC_FORM_ID}
          className="flex min-h-full flex-col"
          onSubmit={saveDraft}
        >
          <GuildDocEditor
            key={`${docId}-${editorSeed}`}
            className="flex-1"
            contentClassName={cn("flex-1 pt-6 pb-24", GUILD_DOC_COLUMN_CLASS)}
            content={content}
            editable={canWrite}
            header={readerBar}
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
