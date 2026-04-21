import type { FC } from "react";
import { useBattleSharing } from "../hooks/use-battle-sharing";
import {
  invalidateBattlesControllerGetBattle,
  invalidateBattlesControllerGetBattleRawData,
  invalidateBattlesControllerGetDashboardBattles,
  useBattlesControllerDeleteBattle,
} from "@/lib/api/generated/battlelog/battles/battles";
import {
  invalidatePublicBattlesControllerGetPublicBattle,
  invalidatePublicBattlesControllerGetPublicBattleRaw,
} from "@/lib/api/generated/battlelog/public-battles/public-battles";
import type { Battle } from "@/lib/api/battlelog-types";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { BattleOverviewCard } from "@/components/battle";
import { useTranslation } from "react-i18next";

export type BattleOverviewProps = {
  battle: Battle;
  showHeader?: boolean;
};

export const BattleOverview: FC<BattleOverviewProps> = ({
  battle,
  showHeader = true,
}) => {
  const { t } = useTranslation();
  const { handleShare, handleCopyLink, handleUnshare, isPending } =
    useBattleSharing();
  const queryClient = useQueryClient();
  const { mutate: deleteBattle } = useBattlesControllerDeleteBattle();
  const navigate = useNavigate();

  const handleShareClick = () => {
    handleShare(battle.id);
  };

  const handleCopyClick = () => {
    handleCopyLink(battle.id);
  };

  const handleUnshareClick = () => {
    handleUnshare(battle.id);
  };

  const handleDeleteClick = () => {
    deleteBattle(
      {
        pathParams: {
          battleId: battle.id,
        },
      },
      {
        onSuccess: async () => {
          await Promise.all([
            invalidateBattlesControllerGetDashboardBattles(queryClient),
            invalidateBattlesControllerGetBattle(queryClient, {
              battleId: battle.id,
            }),
            invalidateBattlesControllerGetBattleRawData(queryClient, {
              battleId: battle.id,
            }),
            invalidatePublicBattlesControllerGetPublicBattle(queryClient, {
              battleId: battle.id,
            }),
            invalidatePublicBattlesControllerGetPublicBattleRaw(queryClient, {
              battleId: battle.id,
            }),
          ]);
          toast.success(t("battlePanel.toasts.battleDeleted"), {
            duration: 3000,
          });
          navigate({ to: "/@me/battle-panel/battles" });
        },
        onError: () => {
          toast.error(t("battlePanel.toasts.battleDeleteError"), {
            duration: 3000,
          });
        },
      },
    );
  };

  return (
    <BattleOverviewCard
      battle={battle}
      onShare={handleShareClick}
      onCopyLink={handleCopyClick}
      onUnshare={handleUnshareClick}
      onDelete={handleDeleteClick}
      isSharePending={isPending}
      cdnBaseUrl={MARGONEM_CDN_CHARACTERS_URL}
      showHeader={showHeader}
    />
  );
};
