import type { Battle } from "@/hooks/api/battle-log/use-battles";
import type { FC } from "react";
import { useBattleSharing } from "../hooks/use-battle-sharing";
import { useDeleteBattle } from "@/hooks/api/battle-log/use-delete-battle";
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
  const { mutate: deleteBattle } = useDeleteBattle();
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
      { battleId: battle.id },
      {
        onSuccess: () => {
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
