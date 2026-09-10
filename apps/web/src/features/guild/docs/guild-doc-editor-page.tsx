import { PageHeader } from "@/components/common/page-header";
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
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { FileText, History, LockKeyhole, Trash2 } from "lucide-react";

import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { GuildDocHistoryDialog } from "./components/guild-doc-history-dialog";
import { formatGuildDocDateTime } from "./docs-date-format";
import { GuildDocEditor } from "./editor/guild-doc-editor";
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
      <div className="flex h-full min-h-0 flex-col bg-background">
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-3 py-3">
            <Card className="flex flex-col items-center justify-center gap-3 border-border bg-card py-12">
              <FileText className="size-12 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                {t("docs.editor.loadError")}
              </p>
            </Card>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-h-full flex-col gap-4 px-3 py-3">
          <PageHeader
            icon={FileText}
            title={document.title}
            description={
              <>
                {t("docs.editor.updatedMeta", {
                  date: formatGuildDocDateTime(document.updatedAt),
                  version: document.version,
                })}
              </>
            }
            status={
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {canWrite ? (
                  <Badge variant="secondary">
                    {t("docs.editor.manualSave")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <LockKeyhole className="size-3" />
                    {t("docs.editor.readOnly")}
                  </Badge>
                )}
              </div>
            }
            actions={
              <>
                {canWrite && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={t("docs.editor.history")}
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
                            variant="outline"
                            size="icon"
                            aria-label={t("docs.trash.move")}
                            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={deleteDocument.isPending}
                            onClick={() => setTrashConfirmOpen(true)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        }
                      />
                      <TooltipContent side="bottom">
                        {t("docs.trash.move")}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </>
            }
          />

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={saveDraft}>
            <SectionCard className="flex min-h-0 flex-1 flex-col  border-border bg-card ">
              <SectionCardHeader title={t("docs.list.title")} />
              <SectionCardContent className="flex min-h-0 flex-col gap-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="guild-doc-editor-title"
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {t("docs.editor.titleLabel")}
                  </Label>
                  <Input
                    id="guild-doc-editor-title"
                    name="guild-doc-editor-title"
                    value={title}
                    disabled={!canWrite}
                    maxLength={TITLE_MAX_LENGTH}
                    placeholder={t("docs.editor.titlePlaceholder")}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </div>

                {!canWrite && (
                  <p className="text-xs text-muted-foreground">
                    {t("docs.editor.readOnlyNotice")}
                  </p>
                )}

                <GuildDocEditor
                  key={`${docId}-${editorSeed}`}
                  className="flex-1"
                  content={content}
                  editable={canWrite}
                  namespace={`guild-doc-${docId}-${editorSeed}`}
                  onChange={setContent}
                />
              </SectionCardContent>
            </SectionCard>

            <UnsavedChangesBar
              isDirty={isDirty}
              isSubmitting={updateDocument.isPending}
              onReset={resetDraft}
            />
          </form>
        </div>
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
                render=<Button loading={deleteDocument.isPending} />
                disabled={deleteDocument.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
