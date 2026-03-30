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
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { useCreateWatchedItem } from "@/hooks/api/notifications/use-watched-items";
import { useNotificationTargets } from "@/hooks/api/notifications/use-notification-targets";
import { useUser } from "@/hooks/api/user/use-user";

interface AddWatchedItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddWatchedItemDialog = ({
  open,
  onOpenChange,
}: AddWatchedItemDialogProps) => {
  const { t } = useTranslation();
  const { user } = useUser();
  const createItem = useCreateWatchedItem();
  const { data: targets } = useNotificationTargets(
    "user",
    user?.discordId ?? "",
  );

  const [itemId, setItemId] = useState("");
  const [itemName, setItemName] = useState("");
  const [world, setWorld] = useState("");
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);

  const handleTargetToggle = (targetId: string) => {
    setSelectedTargetIds((prev) =>
      prev.includes(targetId)
        ? prev.filter((id) => id !== targetId)
        : [...prev, targetId],
    );
  };

  const resetForm = () => {
    setItemId("");
    setItemName("");
    setWorld("");
    setSelectedTargetIds([]);
  };

  const handleCreate = async () => {
    const parsedItemId = Number(itemId);
    if (isNaN(parsedItemId) || !itemName.trim()) return;

    try {
      await createItem.mutateAsync({
        itemId: parsedItemId,
        itemName: itemName.trim(),
        world: world || undefined,
        targetIds: selectedTargetIds.length > 0 ? selectedTargetIds : undefined,
      });
      toast.success(t("settings.notifications.toasts.watchedItemCreated"));
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
            {t("settings.notifications.watchedItems.addItem")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t("settings.notifications.watchedItems.itemId")}</Label>
            <Input
              type="number"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              placeholder="12345"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("settings.notifications.watchedItems.itemName")}</Label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder={t("settings.notifications.watchedItems.itemName")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("settings.notifications.watchedItems.world")}</Label>
            <Input
              value={world}
              onChange={(e) => setWorld(e.target.value)}
              placeholder={t("settings.notifications.watchedItems.world")}
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
                      {target.displayName ?? target.externalId}
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
              disabled={!itemId || !itemName.trim() || createItem.isPending}
            >
              {t("settings.notifications.create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
