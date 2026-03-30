import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { Switch } from "@lootlog/ui/components/switch";
import {
  useNotificationRules,
  useUpdateNotificationRule,
  useDeleteNotificationRule,
} from "@/hooks/api/notifications/use-notification-rules";
import { AddRuleDialog } from "./add-rule-dialog";

interface RulesListProps {
  ownerType: "guild" | "user";
  ownerId: string;
  guildId?: string;
}

const TRIGGER_TYPE_LABELS: Record<string, string> = {
  timer_before_spawn: "settings.notifications.rules.timerBeforeSpawn",
  npc_spawned: "settings.notifications.rules.npcSpawned",
  watched_item_dropped: "settings.notifications.rules.watchedItemDropped",
};

export const RulesList = ({ ownerType, ownerId, guildId }: RulesListProps) => {
  const { t } = useTranslation();
  const { data: rules, isPending } = useNotificationRules(ownerType, ownerId);
  const updateRule = useUpdateNotificationRule();
  const deleteRule = useDeleteNotificationRule();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleToggle = async (ruleId: string, enabled: boolean) => {
    try {
      await updateRule.mutateAsync({ id: ruleId, ownerType, ownerId, enabled });
      toast.success(t("settings.notifications.toasts.ruleUpdated"));
    } catch {
      toast.error(t("settings.notifications.toasts.error"));
    }
  };

  const handleDelete = async (ruleId: string) => {
    try {
      await deleteRule.mutateAsync({ id: ruleId, ownerType, ownerId });
      toast.success(t("settings.notifications.toasts.ruleDeleted"));
    } catch {
      toast.error(t("settings.notifications.toasts.error"));
    }
  };

  return (
    <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-500/10 p-2.5 shadow-inner shadow-amber-500/10">
            <Bell className="size-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold leading-tight">
              {t("settings.notifications.rules.title")}
            </h3>
            <p className="text-xs text-muted-foreground leading-tight">
              {t("settings.notifications.rules.description")}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="size-3.5" />
          {t("settings.notifications.rules.addRule")}
        </Button>
      </div>

      {isPending && (
        <p className="text-xs text-muted-foreground py-2">...</p>
      )}

      {!isPending && (!rules || rules.length === 0) && (
        <p className="text-xs text-muted-foreground py-2">
          {t("settings.notifications.rules.noRules")}
        </p>
      )}

      {rules?.map((rule) => (
        <div
          key={rule.id}
          className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2"
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-medium">
              {t(TRIGGER_TYPE_LABELS[rule.triggerType] ?? rule.triggerType)}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {rule.world && <span>{rule.world}</span>}
              {rule.leadTimeMinutes && (
                <span>
                  {rule.leadTimeMinutes} {t("settings.notifications.rules.leadTimeMinutes")}
                </span>
              )}
              {rule.rulesToTargets && (
                <span>
                  {rule.rulesToTargets.length} {t("settings.notifications.rules.targets")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={rule.enabled}
              onCheckedChange={(checked) => handleToggle(rule.id, checked)}
              disabled={updateRule.isPending}
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => handleDelete(rule.id)}
              disabled={deleteRule.isPending}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      ))}

      <AddRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ownerType={ownerType}
        ownerId={ownerId}
        guildId={guildId}
      />
    </Card>
  );
};
