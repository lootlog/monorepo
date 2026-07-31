import { useTranslation } from "react-i18next";
import { Clock, Pencil, RotateCcw, Settings2, Trash2 } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "@/utils/cn";

interface EventActionsCardProps {
  canManage: boolean;
  canDeleteEvent: boolean;
  isActive: boolean;
  isUpdatePending: boolean;
  isDeletePending: boolean;
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
  onEdit,
  onToggleStatus,
  onDelete,
}: EventActionsCardProps) => {
  const { t } = useTranslation();

  if (!canManage) {
    return null;
  }

  const actionGridClassName = canDeleteEvent
    ? "grid-cols-1 sm:grid-cols-3"
    : "grid-cols-1 sm:grid-cols-2";

  return (
    <Card className="gap-0 overflow-hidden border-border bg-card p-0">
      <div className="flex items-center gap-3 p-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Settings2 className="size-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold">
          {t("events.actionsCard.subtitle")}
        </h3>
      </div>

      <div
        className={cn(
          "grid gap-1 border-t border-border bg-muted/20 p-1.5",
          actionGridClassName,
        )}
      >
        <Button
          size="sm"
          variant="ghost"
          className="w-full min-w-0 justify-center text-muted-foreground hover:text-foreground"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
          {t("events.editButton")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={cn(
            "w-full min-w-0 justify-center",
            isActive
              ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
              : "text-primary hover:bg-primary/10 hover:text-primary",
          )}
          disabled={isUpdatePending}
          onClick={onToggleStatus}
        >
          {isActive ? (
            <Clock className="size-3.5" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
          {isActive ? t("events.end") : t("events.resume")}
        </Button>
        {canDeleteEvent && (
          <Button
            size="sm"
            variant="ghost"
            className="w-full min-w-0 justify-center text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={isDeletePending}
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
            {t("events.delete")}
          </Button>
        )}
      </div>
    </Card>
  );
};
