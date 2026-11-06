import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "@lootlog/ui/components/sonner";

import {
  useDocsControllerDeleteDocument,
  useDocsControllerRestoreDocument,
} from "@lootlog/client/main";

import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { invalidateGuildDocsQueries } from "./docs-api";
import { canManageGuildDocs } from "./docs-permissions";

/**
 * Moving a document to the trash and back. Only admins can restore, so only
 * they trash at once and get "Undo" on the toast; everyone else confirms
 * first, because for them the move cannot be taken back.
 */
export const useGuildDocTrash = () => {
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";
  const queryClient = useQueryClient();
  const { data: accessPolicy } = useGuildPermissions();
  const deleteDocument = useDocsControllerDeleteDocument();
  const restoreDocument = useDocsControllerRestoreDocument();
  const canUndo = canManageGuildDocs(accessPolicy);

  const restore = async (docId: string) => {
    try {
      await restoreDocument.mutateAsync({ pathParams: { guildId, docId } });
      await invalidateGuildDocsQueries(queryClient, guildId, docId);
      toast.success(t("docs.trash.restored"));
    } catch {
      toast.error(t("docs.trash.restoreError"));
    }
  };

  /** Resolves whether the document reached the trash. */
  const moveToTrash = async (docId: string) => {
    try {
      await deleteDocument.mutateAsync({ pathParams: { guildId, docId } });
      await invalidateGuildDocsQueries(queryClient, guildId, docId);

      toast.success(
        t("docs.trash.moved"),
        canUndo
          ? {
              action: {
                label: t("docs.trash.undo"),
                onClick: () => void restore(docId),
              },
            }
          : undefined,
      );

      return true;
    } catch {
      toast.error(t("docs.trash.moveError"));

      return false;
    }
  };

  return {
    confirmBeforeTrash: !canUndo,
    deleteDocument,
    moveToTrash,
    restore,
    restoreDocument,
  };
};
