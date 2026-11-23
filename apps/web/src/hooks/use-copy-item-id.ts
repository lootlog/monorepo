import { useTranslation } from "react-i18next";
import { useClipboardCopy } from "@lootlog/ui/hooks/use-clipboard-copy";
import { toast } from "@lootlog/ui/lib/toast";

export const useCopyItemId = () => {
  const { t } = useTranslation();
  const { state, copy } = useClipboardCopy();

  const copyItemId = async (
    id: string,
    { toastOnSuccess = false }: { toastOnSuccess?: boolean } = {},
  ) => {
    if (state === "copying") return;

    if (!(await copy(id))) {
      toast.error(t("loots.details.copyError"));

      return;
    }

    if (toastOnSuccess) toast.success(t("loots.details.copySuccess"));
  };

  return {
    copyItemId,
    copyState: state,
    copiedMessage: t("loots.details.copySuccess"),
  };
};
