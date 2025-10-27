import type { Battle } from "@/hooks/api/battle-log/use-battles";
import type { FC } from "react";
import { useBattleSharing } from "../hooks/use-battle-sharing";
import { useDeleteBattle } from "@/hooks/api/battle-log/use-delete-battle";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { BattleOverviewCard } from "@/components/battle";

export type BattleOverviewProps = {
  battle: Battle;
};

export const BattleOverview: FC<BattleOverviewProps> = ({ battle }) => {
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
          toast.success("Walka została usunięta.", { duration: 3000 });
          navigate({ to: "/@me/battle-panel/battles" });
        },
        onError: () => {
          toast.error("Wystąpił błąd podczas usuwania walki.", {
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
      labels={{
        header: {
          title: "Przegląd walki",
          copyLink: "Skopiuj link",
          hide: "Ukryj",
          share: "Udostępnij",
          delete: "Usuń",
          deleteConfirmTitle: "Czy na pewno chcesz usunąć tę walkę?",
          deleteConfirmDescription:
            "Ta akcja jest nieodwracalna. Walka zostanie całkowicie usunięta z systemu i nie będzie można jej przywrócić. Nie będzie również brana podczas obliczania statystyk.",
          cancel: "Anuluj",
          deleteBattle: "Usuń walkę",
        },
        teams: {
          userTeam: "Twoja drużyna",
          enemyTeam: "Przeciwnicy",
        },
        metadata: {
          startTime: "Data i godzina rozpoczęcia walki",
          duration: "Czas trwania walki",
          battleType: "Typ walki",
          public: "Publiczna",
          private: "Prywatna",
          publicTooltip:
            "Walka jest publiczna - może być przeglądana przez osoby posiadające link",
          privateTooltip: "Walka jest prywatna - tylko Ty możesz ją zobaczyć",
        },
      }}
    />
  );
};
