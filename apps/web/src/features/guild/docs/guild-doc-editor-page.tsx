import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, History, LockKeyhole, Trash2 } from "lucide-react";
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
import { Label } from "@lootlog/ui/components/label";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import {
  useDocsControllerDeleteDocument,
  useDocsControllerGetDocument,
  useDocsControllerUpdateDocument,
} from "@/lib/api/generated/main/docs/docs";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import {
  guildDocDetailQueryOptions,
  invalidateGuildDocsQueries,
} from "./docs-api";
import { canWriteGuildDocs } from "./docs-permissions";
import { formatGuildDocDateTime } from "./docs-date-format";
import { GuildDocHistoryDialog } from "./components/guild-doc-history-dialog";
import { GuildDocEditor } from "./editor/guild-doc-editor";
import {
  type GuildDocEditorContent,
  normalizeGuildDocEditorContent,
  stringifyGuildDocEditorContent,
} from "./editor/guild-doc-editor-content";
import { GuildDocEditorSkeleton } from "./guild-doc-editor-skeleton";
import { useTranslation } from "react-i18next";

const CONTENT_MAX_LENGTH = 250_000;
const TITLE_MAX_LENGTH = 120;

const createDraftSignature = (title: string, content: GuildDocEditorContent) =>
  `${title.trim()}\n${stringifyGuildDocEditorContent(content)}`;

export const GuildDocEditorPage = () => {
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";
  const { docId = "" } = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: permissions } = useGuildPermissions();
  const canWrite = canWriteGuildDocs(permissions);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<GuildDocEditorContent>(
    normalizeGuildDocEditorContent(null),
  );
  const [savedSignature, setSavedSignature] = useState("");
  const [editorSeed, setEditorSeed] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false);
  const documentQuery = useDocsControllerGetDocument(
    { guildId, docId },
    {
      query: guildDocDetailQueryOptions(guildId, docId),
    },
  );
  const updateDocument = useDocsControllerUpdateDocument();
  const deleteDocument = useDocsControllerDeleteDocument();
  const document = documentQuery.data;
  const draftSignature = createDraftSignature(title, content);
  const isDirty = canWrite && savedSignature !== draftSignature;

  useEffect(() => {
    if (!document) {
      return;
    }

    const normalizedContent = normalizeGuildDocEditorContent(document.content);

    setTitle(document.title);
    setContent(normalizedContent);
    setSavedSignature(createDraftSignature(document.title, normalizedContent));
    setEditorSeed((seed) => seed + 1);
  }, [document?.id, document?.version]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  if (documentQuery.isLoading) {
    return <GuildDocEditorSkeleton />;
  }

  const resetDraft = () => {
    if (!document) {
      return;
    }

    const normalizedContent = normalizeGuildDocEditorContent(document.content);

    setTitle(document.title);
    setContent(normalizedContent);
    setSavedSignature(createDraftSignature(document.title, normalizedContent));
    setEditorSeed((seed) => seed + 1);
  };

  const validateDraft = () => {
    if (title.trim().length > TITLE_MAX_LENGTH) {
      toast.error(t("docs.editor.titleTooLong"));
      return false;
    }

    if (stringifyGuildDocEditorContent(content).length > CONTENT_MAX_LENGTH) {
      toast.error(t("docs.editor.tooLong"));
      return false;
    }

    return true;
  };

  const saveDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!document || !canWrite || !validateDraft()) {
      return;
    }

    updateDocument.mutate(
      {
        pathParams: { guildId, docId },
        data: {
          title: title.trim(),
          content,
        },
      },
      {
        onError: () => {
          toast.error(t("docs.editor.saveError"));
        },
        onSuccess: async (updatedDocument) => {
          const normalizedContent = normalizeGuildDocEditorContent(
            updatedDocument.content,
          );

          setTitle(updatedDocument.title);
          setContent(normalizedContent);
          setSavedSignature(
            createDraftSignature(updatedDocument.title, normalizedContent),
          );
          setEditorSeed((seed) => seed + 1);
          await invalidateGuildDocsQueries(queryClient, guildId, docId);
          toast.success(t("docs.editor.saved"));
        },
      },
    );
  };

  const moveDocumentToTrash = async () => {
    if (!document || !canWrite) {
      return;
    }

    try {
      await deleteDocument.mutateAsync({
        pathParams: { guildId, docId },
      });
      await invalidateGuildDocsQueries(queryClient, guildId, docId);
      setTrashConfirmOpen(false);
      toast.success(t("docs.trash.moved"));
      navigate({
        to: `/${guildId}/docs`,
      });
    } catch {
      toast.error(t("docs.trash.moveError"));
    }
  };

  if (documentQuery.isError || !document) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background/50">
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-3 py-3">
            <Card className="flex flex-col items-center justify-center gap-3 border-border bg-card/40 py-12 backdrop-blur-sm">
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
    <div className="flex h-full min-h-0 flex-col bg-background/50">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-h-[calc(100vh-3.5rem)] flex-col gap-4 px-3 py-3">
          <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
                  <FileText className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold leading-tight">
                    {document.title}
                  </h2>
                  <p className="text-xs leading-tight text-muted-foreground">
                    {t("docs.editor.updatedMeta", {
                      date: formatGuildDocDateTime(document.updatedAt),
                      version: document.version,
                    })}
                  </p>
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
                </div>
              </div>

              {canWrite && (
                <div className="flex flex-wrap items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={t("docs.editor.history")}
                        onClick={() => setHistoryOpen(true)}
                      >
                        <History className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {t("docs.editor.history")}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {t("docs.trash.move")}
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </Card>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={saveDraft}>
            <Card className="flex min-h-0 flex-1 flex-col gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
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
            </Card>

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
        <AlertDialog open={trashConfirmOpen} onOpenChange={setTrashConfirmOpen}>
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
                disabled={deleteDocument.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(event) => {
                  event.preventDefault();
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
