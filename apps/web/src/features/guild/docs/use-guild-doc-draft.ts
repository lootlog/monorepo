import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "@lootlog/ui/components/sonner";

import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  useDocsControllerGetDocument,
  useDocsControllerUpdateDocument,
} from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import {
  guildDocDetailQueryOptions,
  invalidateGuildDocsQueries,
} from "./docs-api";
import { canWriteGuildDocs } from "./docs-permissions";
import { useGuildDocTrash } from "./use-guild-doc-trash";
import {
  normalizeGuildDocEditorContent,
  stringifyGuildDocEditorContent,
  type GuildDocEditorContent,
} from "./editor/guild-doc-editor-content";

const CONTENT_MAX_LENGTH = 250_000;

export const TITLE_MAX_LENGTH = 120;

/** The page's form, which the title in the top bar is saved with. */
export const GUILD_DOC_FORM_ID = "guild-doc-editor-form";

const createDraftSignature = (title: string, content: GuildDocEditorContent) =>
  `${title.trim()}\n${stringifyGuildDocEditorContent(content)}`;

export const useGuildDocDraft = () => {
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";
  const { docId = "" } = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: accessPolicy } = useGuildPermissions();
  const canWrite = canWriteGuildDocs(accessPolicy);
  const [title, setTitle] = useState("");

  const [content, setContent] = useState<GuildDocEditorContent>(() =>
    normalizeGuildDocEditorContent(null),
  );

  const [savedSignature, setSavedSignature] = useState("");
  // The version the draft is based on; a save from an older one is refused.
  const [baseVersion, setBaseVersion] = useState<number | undefined>();
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

  const { confirmBeforeTrash, deleteDocument, moveToTrash } =
    useGuildDocTrash();

  const document = documentQuery.data;
  const draftSignature = createDraftSignature(title, content);
  const isDirty = canWrite && savedSignature !== draftSignature;

  const resetDraft = () => {
    if (!document) {
      return;
    }

    const normalizedContent = normalizeGuildDocEditorContent(document.content);

    setTitle(document.title);
    setContent(normalizedContent);
    setSavedSignature(createDraftSignature(document.title, normalizedContent));
    setBaseVersion(document.version);
    setEditorSeed((seed) => seed + 1);
  };

  const [previousDocument, setPreviousDocument] =
    useState<typeof document>(undefined);

  // A newer version replaces the draft only when it has no unsaved edits, so
  // a save's refetch or another member's change never discards typing. A
  // draft kept over another member's version cannot overwrite it.
  if (
    previousDocument?.id !== document?.id ||
    previousDocument?.version !== document?.version
  ) {
    setPreviousDocument(document);

    if (previousDocument?.id !== document?.id || !isDirty) resetDraft();
  }

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

    if (
      !document ||
      !canWrite ||
      updateDocument.isPending ||
      !validateDraft()
    ) {
      return;
    }

    const submittedSignature = draftSignature;

    updateDocument.mutate(
      {
        pathParams: { guildId, docId },
        data: {
          title: title.trim(),
          content,
          baseVersion,
        },
      },
      {
        onError: (error) => {
          toast.error(
            t(
              error.status === 409
                ? "docs.editor.conflict"
                : "docs.editor.saveError",
            ),
          );
        },
        onSuccess: async (updatedDocument) => {
          // Edits made while the request ran stay in the editor, unsaved.
          setSavedSignature(submittedSignature);
          setBaseVersion(updatedDocument.version);
          await invalidateGuildDocsQueries(queryClient, guildId, docId);
          toast.success(t("docs.editor.saved"));
        },
      },
    );
  };

  /** Resolves whether the document reached the trash. */
  const moveDocumentToTrash = async () => {
    if (!document || !canWrite) return false;

    if (!(await moveToTrash(docId))) return false;

    setTrashConfirmOpen(false);
    navigate({ to: `/${guildId}/docs` });

    return true;
  };

  const requestTrash = () => {
    if (confirmBeforeTrash) setTrashConfirmOpen(true);
    else void moveDocumentToTrash();
  };

  return {
    title,
    document,
    t,
    canWrite,
    setHistoryOpen,
    deleteDocument,
    requestTrash,
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
  };
};
