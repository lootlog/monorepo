import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Hash, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import {
  useNotificationTargets,
  useDeleteNotificationTarget,
} from "@/hooks/api/notifications/use-notification-targets";
import { AddTargetDialog } from "./add-target-dialog";

interface TargetsListProps {
  ownerType: "guild" | "user";
  ownerId: string;
}

export const TargetsList = ({ ownerType, ownerId }: TargetsListProps) => {
  const { t } = useTranslation();
  const { data: targets, isPending } = useNotificationTargets(ownerType, ownerId);
  const deleteTarget = useDeleteNotificationTarget();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDelete = async (id: string) => {
    try {
      await deleteTarget.mutateAsync({ id, ownerType, ownerId });
      toast.success(t("settings.notifications.toasts.targetDeleted"));
    } catch {
      toast.error(t("settings.notifications.toasts.error"));
    }
  };

  return (
    <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/10 p-2.5 shadow-inner shadow-blue-500/10">
            <Hash className="size-4 text-blue-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold leading-tight">
              {t("settings.notifications.targets.title")}
            </h3>
            <p className="text-xs text-muted-foreground leading-tight">
              {t("settings.notifications.targets.description")}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="size-3.5" />
          {t("settings.notifications.targets.addTarget")}
        </Button>
      </div>

      {isPending && (
        <p className="text-xs text-muted-foreground py-2">
          {t("settings.notifications.targets.loadingChannels")}
        </p>
      )}

      {!isPending && (!targets || targets.length === 0) && (
        <p className="text-xs text-muted-foreground py-2">
          {t("settings.notifications.targets.noTargets")}
        </p>
      )}

      {targets?.map((target) => (
        <div
          key={target.id}
          className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Hash className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm truncate">
              {target.displayName ?? target.externalId}
            </span>
            <span className="text-xs text-muted-foreground">
              {target.targetType === "channel"
                ? t("settings.notifications.targets.channel")
                : t("settings.notifications.targets.dm")}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-xs ${target.enabled ? "text-green-500" : "text-muted-foreground"}`}
            >
              {target.enabled
                ? t("settings.notifications.targets.enabled")
                : t("settings.notifications.targets.disabled")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => handleDelete(target.id)}
              disabled={deleteTarget.isPending}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      ))}

      <AddTargetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ownerType={ownerType}
        ownerId={ownerId}
      />
    </Card>
  );
};
