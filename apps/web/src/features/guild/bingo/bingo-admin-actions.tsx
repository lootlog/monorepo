import type { BingoBoardSummaryResponseDtoStatus } from "@lootlog/client/main";
import { DETAIL_BAR_TOOLBAR_CELL_CLASS } from "@/components/common/detail-bar";
import { ROUTES } from "@/config/routes";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { Link } from "@tanstack/react-router";
import {
  ClipboardCheck,
  Flag,
  MoreHorizontal,
  Play,
  Settings2,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

type BingoAdminActionsProps = {
  readonly guildId: string;
  readonly boardId: string;
  readonly status: BingoBoardSummaryResponseDtoStatus;
  readonly isUpdating: boolean;
  readonly onChangeStatus: (status: BingoBoardSummaryResponseDtoStatus) => void;
  readonly onOpenManual: () => void;
  readonly onOpenDelete: () => void;
};

const STATUS_ACTION = {
  DRAFT: {
    next: "ACTIVE",
    icon: Play,
    labelKey: "bingo.actions.start",
    shortLabelKey: "bingo.actions.startShort",
  },
  ACTIVE: {
    next: "FINISHED",
    icon: Flag,
    labelKey: "bingo.actions.finish",
    shortLabelKey: "bingo.actions.finishShort",
  },
  FINISHED: {
    next: "ACTIVE",
    icon: Play,
    labelKey: "bingo.actions.reopen",
    shortLabelKey: "bingo.actions.reopenShort",
  },
} as const satisfies Record<
  BingoBoardSummaryResponseDtoStatus,
  {
    next: BingoBoardSummaryResponseDtoStatus;
    icon: LucideIcon;
    labelKey: string;
    shortLabelKey: string;
  }
>;

export const BingoAdminActions = ({
  guildId,
  boardId,
  status,
  isUpdating,
  onChangeStatus,
  onOpenManual,
  onOpenDelete,
}: BingoAdminActionsProps) => {
  const { t } = useTranslation();
  const statusAction = STATUS_ACTION[status];
  const StatusIcon = statusAction.icon;

  return (
    <>
      <Button
        size="lg"
        variant="chip"
        className={DETAIL_BAR_TOOLBAR_CELL_CLASS}
        loading={isUpdating}
        disabled={isUpdating}
        onClick={() => onChangeStatus(statusAction.next)}
      >
        <StatusIcon className="size-4" />
        <span className="@max-[36rem]/detail-bar:hidden">
          {t(statusAction.labelKey)}
        </span>
        <span className="hidden @max-[36rem]/detail-bar:inline">
          {t(statusAction.shortLabelKey)}
        </span>
      </Button>
      <Button
        size="lg"
        variant="chip"
        className={DETAIL_BAR_TOOLBAR_CELL_CLASS}
        onClick={onOpenManual}
      >
        <ClipboardCheck className="size-4" />
        <span className="@max-[36rem]/detail-bar:hidden">
          {t("bingo.actions.manualOverride")}
        </span>
        <span className="hidden @max-[36rem]/detail-bar:inline">
          {t("bingo.actions.manualOverrideShort")}
        </span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon-lg"
              variant="chip"
              className={DETAIL_BAR_TOOLBAR_CELL_CLASS}
              aria-label={t("bingo.header.manage")}
            >
              <MoreHorizontal className="size-4" />
              <span className="hidden @max-[36rem]/detail-bar:inline">
                {t("bingo.header.manageShort")}
              </span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            render={<Link to={ROUTES.guild.bingo.edit(guildId, boardId)} />}
          >
            <Settings2 className="size-4" />
            {t("bingo.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onOpenDelete}>
            <Trash2 className="size-4" />
            {t("bingo.actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
