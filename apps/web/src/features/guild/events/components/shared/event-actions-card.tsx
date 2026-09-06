import { SectionCardFooter } from "@/components/common/section-card/section-card-footer";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { useTranslation } from "react-i18next";
import { Clock, Pencil, RotateCcw, Settings2, Trash2 } from "lucide-react";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";

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
    <SectionCard className="gap-0 overflow-hidden border-border bg-card p-0">
      <SectionCardHeader
        icon={Settings2}
        title={<> {t("events.actionsCard.subtitle")} </>}
      />

      <SectionCardFooter
        className={cn(
          "grid gap-1 border-t-0 bg-muted/20 p-1.5",
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
      </SectionCardFooter>
    </SectionCard>
  );
};
