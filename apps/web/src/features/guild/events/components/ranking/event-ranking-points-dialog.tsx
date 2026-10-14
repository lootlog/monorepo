import { useTranslation } from "react-i18next";
import type { EventRanking } from "../../types/api";
import { ManualPointsEditDialog } from "../dialogs/manual-points-edit-dialog";
import { getRankingMemberName } from "./get-ranking-member-name";

type EventRankingPointsDialogProps = {
  ranking: EventRanking;
  isPending: boolean;
  onClose: () => void;
  onEditPoints: (
    rankingId: string,
    pointsDelta: number,
    comment?: string,
  ) => Promise<void>;
};

export const EventRankingPointsDialog = ({
  ranking,
  isPending,
  onClose,
  onEditPoints,
}: EventRankingPointsDialogProps) => {
  const { t } = useTranslation();

  const memberName = getRankingMemberName(ranking, t);

  return (
    <ManualPointsEditDialog
      open
      // Keep the focus container stable while its action button remounts:
      // the row's last cell, or a phone tile's actions.
      finalFocus={() =>
        document
          .getElementById(`event-ranking-row-${ranking.id}`)
          ?.querySelector<HTMLElement>("td:last-child, [data-ranking-actions]")
      }
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t("events.points.rankingDialogTitle", { memberName })}
      description={t("events.points.rankingDialogDescription", {
        heroNpcName: ranking.heroNpcName,
      })}
      currentPoints={ranking.totalPoints}
      isPending={isPending}
      onSubmit={({ pointsDelta, comment }) =>
        onEditPoints(ranking.id, pointsDelta, comment)
      }
    />
  );
};
