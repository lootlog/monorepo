import { useTranslation } from "react-i18next";
import {
  Clock,
  Pencil,
  RotateCcw,
  Settings2,
  Star,
  Trash2,
} from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { useToggleEventPin } from "@/features/guild/events/hooks/mutations/use-toggle-event-pin";

interface EventActionsCardProps {
  eventId: string;
  guildId: string;
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
  eventId,
  guildId,
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
  const { togglePin, isPinned } = useToggleEventPin(guildId);
  const pinned = isPinned(eventId);

  return (
    <Card className="gap-3 border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2">
          <Settings2 className="size-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("events.actionsCard.subtitle")}
          </p>
          <h3 className="text-base font-semibold">
            {t("events.actionsCard.title")}
          </h3>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={pinned ? "default" : "outline"}
          onClick={() => togglePin(eventId)}
        >
          <Star
            className={`size-3.5 ${pinned ? "fill-yellow-500 text-yellow-500" : ""}`}
          />
          {pinned ? t("events.unpinEvent") : t("events.pinEvent")}
        </Button>
        {canManage && (
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="size-3.5" />
            {t("events.editButton")}
          </Button>
        )}
      </div>

      {canManage && (
        <div className="flex flex-wrap gap-2 border-t border-border/50 pt-3">
          <Button
            size="sm"
            variant={isActive ? "destructive" : "default"}
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
              variant="destructive"
              disabled={isDeletePending}
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
              {t("events.delete")}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};
