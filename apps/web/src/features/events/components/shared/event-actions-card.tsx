import { useTranslation } from "react-i18next";
import {
  BookText,
  Clock,
  Pencil,
  RotateCcw,
  Settings2,
  Trash2,
} from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";

interface EventActionsCardProps {
  canManage: boolean;
  canDeleteEvent: boolean;
  isActive: boolean;
  isUpdatePending: boolean;
  isDeletePending: boolean;
  onOpenRules: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

export const EventActionsCard = ({
  canManage,
  canDeleteEvent,
  isActive,
  isUpdatePending,
  isDeletePending,
  onOpenRules,
  onEdit,
  onToggleStatus,
  onDelete,
}: EventActionsCardProps) => {
  const { t } = useTranslation();

  return (
    <Card className="gap-2 border-border bg-card/40 p-2.5 backdrop-blur-sm">
      <div className="space-y-0.5">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Settings2 className="size-4 text-primary" />
          {t("events.actionsCard.title")}
        </h3>
      </div>

      <div className="mt-3 flex flex-row flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 max-w-full justify-start gap-1 px-2 text-[11px] has-[>svg]:px-2"
          onClick={onOpenRules}
        >
          <BookText className="h-3.5 w-3.5" />
          {t("events.rulesDialog.trigger")}
        </Button>

        {canManage && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 max-w-full justify-start gap-1 px-2 text-[11px] has-[>svg]:px-2"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("events.editButton")}
          </Button>
        )}

        {canManage && (
          <Button
            size="sm"
            variant={isActive ? "destructive" : "default"}
            className="h-7 max-w-full justify-start gap-1 px-2 text-[11px] has-[>svg]:px-2"
            disabled={isUpdatePending}
            onClick={onToggleStatus}
          >
            {isActive ? (
              <Clock className="h-3.5 w-3.5" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            {isActive ? t("events.end") : t("events.resume")}
          </Button>
        )}

        {canDeleteEvent && (
          <Button
            size="sm"
            variant="destructive"
            className="h-7 max-w-full justify-start gap-1 px-2 text-[11px] has-[>svg]:px-2"
            disabled={isDeletePending}
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("events.delete")}
          </Button>
        )}
      </div>
    </Card>
  );
};
