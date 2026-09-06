import {
  invalidateBattlesControllerGetBattle,
  invalidateBattlesControllerGetDashboardBattles,
  useBattlesControllerUpdateBattle,
} from "@lootlog/client/battlelog";
import {
  invalidatePublicBattlesControllerGetPublicBattle,
  invalidatePublicBattlesControllerGetPublicBattleRaw,
  invalidatePublicBattlesControllerGetPublicBattleTimeline,
} from "@lootlog/client/battlelog";
import { BATTLELOG_PUBLIC_URL } from "@/config/addon";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const useBattleSharing = () => {
  const queryClient = useQueryClient();
  const { mutateAsync: editBattle } = useBattlesControllerUpdateBattle();
  const [pendingAction, setPendingAction] = useState<{
    battleId: string;
    action: "share" | "unshare" | "copy";
  } | null>(null);
  const busy = useRef(false);
  const [, copy] = useCopyToClipboard();
  const { t } = useTranslation();

  const composeBattleUrl = (battleId: string) => {
    return `${BATTLELOG_PUBLIC_URL}/battles/${battleId}`;
  };

  const handleCopy = async (url: string) => {
    try {
      if (!(await copy(url))) {
        toast.error(t("battlePanel.toasts.linkCopyError"), { duration: 3000 });
        return;
      }
      toast.success(t("battlePanel.toasts.linkCopied"), {
        duration: 3000,
      });
    } catch {
      toast.error(t("battlePanel.toasts.linkCopyError"), {
        duration: 3000,
      });
    }
  };

  const runAction = async (
    battleId: string,
    action: "share" | "unshare" | "copy",
  ) => {
    if (busy.current) return;
    busy.current = true;
    setPendingAction({ battleId, action });
    await (async () => {
      try {
        if (action === "copy") {
          await handleCopy(composeBattleUrl(battleId));
          return;
        }
        await editBattle({
          pathParams: { battleId },
          data: { public: action === "share" },
        });
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
        toast.success(
          t(
            action === "share"
              ? "battlePanel.toasts.battleShared"
              : "battlePanel.toasts.battleHidden",
          ),
          { duration: 3000 },
        );
        if (action === "share") await handleCopy(composeBattleUrl(battleId));
      } catch {
        toast.error(
          t(
            action === "share"
              ? "battlePanel.toasts.battleShareError"
              : "battlePanel.toasts.battleHideError",
          ),
          { duration: 3000 },
        );
      }
    })().finally(() => {
      busy.current = false;
      setPendingAction(null);
    });
  };

  const handleShare = (battleId: string) => runAction(battleId, "share");
  const handleCopyLink = (battleId: string) => runAction(battleId, "copy");
  const handleUnshare = (battleId: string) => runAction(battleId, "unshare");

  return {
    handleShare,
    handleCopyLink,
    handleUnshare,
    isPending: pendingAction !== null,
    pendingAction,
  };
};
