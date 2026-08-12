import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, Pencil } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import type { EventRanking } from "../../types/api";
import { ManualPointsEditDialog } from "../dialogs/manual-points-edit-dialog";

type EventRankingActionsProps = {
  ranking: EventRanking;
  canEdit?: boolean;
  onEditPoints?: (
    rankingId: string,
    pointsDelta: number,
    comment?: string,
  ) => Promise<void>;
  isEditPending?: boolean;
};

export const EventRankingActions = ({
  ranking,
  canEdit = false,
  onEditPoints,
  isEditPending = false,
}: EventRankingActionsProps) => {
  const { t } = useTranslation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const memberLabel =
    ranking.member?.name ??
    t("events.ranking.memberFallback", {
      memberId: ranking.memberId,
    });

  const handleDialogSubmit = async ({
    pointsDelta,
    comment,
  }: {
    pointsDelta: number;
    comment?: string;
  }) => {
    await onEditPoints?.(ranking.id, pointsDelta, comment);
  };

  if (!canEdit) {
    return null;
  }

  return (
    <>
      <div className="flex justify-end">
        <div className="hidden items-center lg:flex">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={() => setIsEditDialogOpen(true)}
                disabled={isEditPending}
                aria-label={t("events.points.edit")}
              >
                <Pencil className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("events.points.edit")}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-11 text-muted-foreground lg:hidden"
              disabled={isEditPending}
              aria-label={t("events.ranking.moreActions")}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
              <Pencil className="size-4" />
              {t("events.points.edit")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ManualPointsEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title={t("events.points.rankingDialogTitle", {
          memberName: memberLabel,
        })}
        description={t("events.points.rankingDialogDescription", {
          heroNpcName: ranking.heroNpcName,
        })}
        currentPoints={ranking.totalPoints}
        isPending={isEditPending}
        onSubmit={handleDialogSubmit}
      />
    </>
  );
};
