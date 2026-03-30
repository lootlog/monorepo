import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { useNotificationTargets } from "@/hooks/api/notifications/use-notification-targets";
import { useCreateNotificationRule } from "@/hooks/api/notifications/use-notification-rules";

interface AddRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerType: "guild" | "user";
  ownerId: string;
  guildId?: string;
}

export const AddRuleDialog = ({
  open,
  onOpenChange,
  ownerType,
  ownerId,
  guildId,
}: AddRuleDialogProps) => {
  const { t } = useTranslation();
  const { data: targets } = useNotificationTargets(ownerType, ownerId);
  const createRule = useCreateNotificationRule();

  const [triggerType, setTriggerType] = useState<string>("");
  const [world, setWorld] = useState("");
  const [leadTimeMinutes, setLeadTimeMinutes] = useState("5");
  const [npcIds, setNpcIds] = useState("");
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);

  const handleTargetToggle = (targetId: string) => {
    setSelectedTargetIds((prev) =>
      prev.includes(targetId)
        ? prev.filter((id) => id !== targetId)
        : [...prev, targetId],
    );
  };

  const resetForm = () => {
    setTriggerType("");
    setWorld("");
    setLeadTimeMinutes("5");
    setNpcIds("");
    setSelectedTargetIds([]);
  };

  const handleCreate = async () => {
    if (!triggerType) return;

    const filters: Record<string, unknown> = {};
    if (npcIds.trim()) {
      filters.npcIds = npcIds
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => !isNaN(id));
    }

    try {
      await createRule.mutateAsync({
        ownerType,
        ownerId,
        triggerType: triggerType as "timer_before_spawn" | "npc_spawned" | "watched_item_dropped",
        guildId,
        world: world || undefined,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        leadTimeMinutes:
          triggerType === "timer_before_spawn"
            ? Number(leadTimeMinutes)
            : undefined,
        targetIds: selectedTargetIds,
      });
      toast.success(t("settings.notifications.toasts.ruleCreated"));
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error(t("settings.notifications.toasts.error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("settings.notifications.rules.addRule")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t("settings.notifications.rules.triggerType")}</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("settings.notifications.rules.triggerType")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timer_before_spawn">
                  {t("settings.notifications.rules.timerBeforeSpawn")}
                </SelectItem>
                <SelectItem value="npc_spawned">
                  {t("settings.notifications.rules.npcSpawned")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("settings.notifications.rules.world")}</Label>
            <Input
              value={world}
              onChange={(e) => setWorld(e.target.value)}
              placeholder={t("settings.notifications.rules.world")}
            />
          </div>

          {triggerType === "timer_before_spawn" && (
            <div className="flex flex-col gap-2">
              <Label>
                {t("settings.notifications.rules.leadTimeMinutes")}
              </Label>
              <Input
                type="number"
                min="1"
                max="60"
                value={leadTimeMinutes}
                onChange={(e) => setLeadTimeMinutes(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>{t("settings.notifications.rules.npcIds")}</Label>
            <Input
              value={npcIds}
              onChange={(e) => setNpcIds(e.target.value)}
              placeholder="123, 456, 789"
            />
          </div>

          {targets && targets.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>{t("settings.notifications.rules.selectTargets")}</Label>
              <div className="flex flex-col gap-1.5">
                {targets.map((target) => (
                  <label
                    key={target.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedTargetIds.includes(target.id)}
                      onCheckedChange={() => handleTargetToggle(target.id)}
                    />
                    <span>
                      # {target.displayName ?? target.externalId}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("settings.notifications.cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!triggerType || createRule.isPending}
            >
              {t("settings.notifications.create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
