import { useTranslation } from "react-i18next";
import { BookText, Clock, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";

interface EventActionsCardProps {
  eventName: string;
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
  eventName,
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
    <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">
          {t("events.actionsCard.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("events.actionsCard.description", { name: eventName })}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onOpenRules}
        >
          <BookText className="h-4 w-4" />
          {t("events.rulesDialog.trigger")}
        </Button>

        {canManage && (
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
            {t("events.editButton")}
          </Button>
        )}

        {canManage && (
          <Button
            variant={isActive ? "destructive" : "default"}
            className="w-full justify-start gap-2"
            disabled={isUpdatePending}
            onClick={onToggleStatus}
          >
            {isActive ? (
              <Clock className="h-4 w-4" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            {isActive ? t("events.end") : t("events.resume")}
          </Button>
        )}

        {canDeleteEvent && (
          <Button
            variant="destructive"
            className="w-full justify-start gap-2"
            disabled={isDeletePending}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            {t("events.delete")}
          </Button>
        )}
      </div>
    </Card>
  );
};
