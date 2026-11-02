import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

/**
 * Copies an item identifier (`ITEM#…`) and reports the result. `copyingId` is
 * the identifier still being written, so a list can mark just that row busy.
 */
export const useCopyItemId = () => {
  const { t } = useTranslation();
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const copyItemId = async (id: string) => {
    if (copyingId !== null) return;
    setCopyingId(id);

    try {
      await navigator.clipboard.writeText(id);
      toast.success(t("loots.details.copySuccess"));
    } catch {
      toast.error(t("loots.details.copyError"));
    } finally {
      setCopyingId(null);
    }
  };

  return { copyItemId, copyingId };
};
