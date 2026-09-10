import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  useDocsControllerDeleteDocument,
  useDocsControllerGetDocument,
  useDocsControllerUpdateDocument,
} from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import {
  guildDocDetailQueryOptions,
  invalidateGuildDocsQueries,
} from "./docs-api";
import { canWriteGuildDocs } from "./docs-permissions";
import {
  normalizeGuildDocEditorContent,
  stringifyGuildDocEditorContent,
  type GuildDocEditorContent,
} from "./editor/guild-doc-editor-content";

const CONTENT_MAX_LENGTH = 250_000;
export const TITLE_MAX_LENGTH = 120;

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

  const [previousDocument, setPreviousDocument] =
    useState<typeof document>(undefined);
  if (
    previousDocument?.id !== document?.id ||
    previousDocument?.version !== document?.version
  ) {
    setPreviousDocument(document);
    resetDraft();
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

  return {
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
  };
};
