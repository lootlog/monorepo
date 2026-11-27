import type { BingoBoardSummaryResponseDtoStatus } from "@lootlog/client/main";
import { ROUTES } from "@/config/routes";
import { Button } from "@lootlog/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ClipboardCheck, Flag, Play, Settings2, Trash2 } from "lucide-react";
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

  return (
    <>
      {status !== "ACTIVE" ? (
        <Button
          size="sm"
          icon={<Play className="size-4" />}
          disabled={isUpdating}
          onClick={() => onChangeStatus("ACTIVE")}
        >
          {status === "DRAFT"
            ? t("bingo.actions.start")
            : t("bingo.actions.reopen")}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          icon={<Flag className="size-4" />}
          disabled={isUpdating}
          onClick={() => onChangeStatus("FINISHED")}
        >
          {t("bingo.actions.finish")}
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        icon={<ClipboardCheck className="size-4" />}
        onClick={onOpenManual}
      >
        {t("bingo.actions.manualOverride")}
      </Button>
      <Button
        size="sm"
        variant="outline"
        nativeButton={false}
        icon={<Settings2 className="size-4" />}
        render={<Link to={ROUTES.guild.bingo.edit(guildId, boardId)} />}
      >
        {t("bingo.edit")}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        icon={<Trash2 className="size-4" />}
        onClick={onOpenDelete}
        aria-label={t("bingo.actions.delete")}
      />
    </>
  );
};
