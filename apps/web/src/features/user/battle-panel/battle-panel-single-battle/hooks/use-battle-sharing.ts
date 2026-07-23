import {
  invalidateBattlesControllerGetBattle,
  invalidateBattlesControllerGetDashboardBattles,
  useBattlesControllerUpdateBattle,
} from "@lootlog/api-client/react-query/battlelog/battles";
import {
  invalidatePublicBattlesControllerGetPublicBattle,
  invalidatePublicBattlesControllerGetPublicBattleRaw,
  invalidatePublicBattlesControllerGetPublicBattleTimeline,
} from "@lootlog/api-client/react-query/battlelog/public-battles";
import { BATTLELOG_PUBLIC_URL } from "@/config/addon";
import { useQueryClient } from "@tanstack/react-query";
import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const useBattleSharing = () => {
  const queryClient = useQueryClient();
  const { mutate: editBattle, isPending } = useBattlesControllerUpdateBattle();
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
      {
        pathParams: { battleId },
        data: { public: true },
      },
      {
        onSuccess: async (response) => {
          await Promise.all([
            invalidateBattlesControllerGetBattle(queryClient, { battleId }),
            invalidateBattlesControllerGetDashboardBattles(queryClient),
            invalidatePublicBattlesControllerGetPublicBattle(queryClient, {
              battleId,
            }),
            invalidatePublicBattlesControllerGetPublicBattleRaw(queryClient, {
              battleId,
            }),
            invalidatePublicBattlesControllerGetPublicBattleTimeline(
              queryClient,
              {
                battleId,
              },
            ),
          ]);
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
      {
        pathParams: { battleId },
        data: { public: false },
      },
      {
        onSuccess: async () => {
          await Promise.all([
            invalidateBattlesControllerGetBattle(queryClient, { battleId }),
            invalidateBattlesControllerGetDashboardBattles(queryClient),
            invalidatePublicBattlesControllerGetPublicBattle(queryClient, {
              battleId,
            }),
            invalidatePublicBattlesControllerGetPublicBattleRaw(queryClient, {
              battleId,
            }),
            invalidatePublicBattlesControllerGetPublicBattleTimeline(
              queryClient,
              {
                battleId,
              },
            ),
          ]);
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
