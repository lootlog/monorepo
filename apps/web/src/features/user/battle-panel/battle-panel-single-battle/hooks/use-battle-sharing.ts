import { useEditBattle } from "@/hooks/api/battle-log/use-edit-battle";
import { BATTLELOG_PUBLIC_URL } from "@/config/addon";
import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const useBattleSharing = () => {
  const { mutate: editBattle, isPending } = useEditBattle();
  const [, copy] = useCopyToClipboard();
  const { t } = useTranslation();

  const composeBattleUrl = (battleId: string) => {
    return `${BATTLELOG_PUBLIC_URL}/battles/${battleId}`;
  };

  const handleCopy = async (url: string) => {
    try {
      await copy(url);
      toast.success(t("battlePanel.toasts.linkCopied"), {
        duration: 3000,
      });
    } catch {
      toast.error(t("battlePanel.toasts.linkCopyError"), {
        duration: 3000,
      });
    }
  };

  const handleShare = (battleId: string) => {
    editBattle(
      { battleId, data: { public: true } },
      {
        onSuccess: (response) => {
          const battleUrl = composeBattleUrl(response.id);
          toast.success(t("battlePanel.toasts.battleShared"), {
            duration: 3000,
          });
          handleCopy(battleUrl);
        },
        onError: () => {
          toast.error(t("battlePanel.toasts.battleShareError"), {
            duration: 3000,
          });
        },
      },
    );
  };

  const handleCopyLink = (battleId: string) => {
    const battleUrl = composeBattleUrl(battleId);
    handleCopy(battleUrl);
  };

  const handleUnshare = (battleId: string) => {
    editBattle(
      { battleId, data: { public: false } },
      {
        onSuccess: () => {
          toast.success(t("battlePanel.toasts.battleHidden"), {
            duration: 3000,
          });
        },
        onError: () => {
          toast.error(t("battlePanel.toasts.battleHideError"), {
            duration: 3000,
          });
        },
      },
    );
  };

  return {
    handleShare,
    handleCopyLink,
    handleUnshare,
    isPending,
  };
};
