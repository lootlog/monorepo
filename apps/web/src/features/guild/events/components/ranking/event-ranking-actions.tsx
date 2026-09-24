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

type EventRankingActionsProps = {
  canEdit?: boolean;
  onEditPoints: () => void;
  isEditPending?: boolean;
};

export const EventRankingActions = ({
  canEdit = false,
  onEditPoints,
  isEditPending = false,
}: EventRankingActionsProps) => {
  const { t } = useTranslation();

  if (!canEdit) {
    return null;
  }

  return (
    <div className="flex justify-end">
      <div className="hidden items-center lg:flex">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={onEditPoints}
                disabled={isEditPending}
                aria-label={t("events.points.edit")}
              >
                <Pencil className="size-3.5" />
              </Button>
            }
          />
          <TooltipContent>
            <p>{t("events.points.edit")}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon"
              variant="ghost"
              className="size-11 text-muted-foreground lg:hidden"
              disabled={isEditPending}
              aria-label={t("events.ranking.moreActions")}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onEditPoints}>
            <Pencil className="size-4" />
            {t("events.points.edit")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
