import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import {
  useWatchedItems,
  useDeleteWatchedItem,
} from "@/hooks/api/notifications/use-watched-items";
import { AddWatchedItemDialog } from "./add-watched-item-dialog";

interface WatchedItemsListProps {
  userId: string;
}

export const WatchedItemsList = ({ userId }: WatchedItemsListProps) => {
  const { t } = useTranslation();
  const { data: items, isPending } = useWatchedItems(userId);
  const deleteItem = useDeleteWatchedItem();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDelete = async (id: string) => {
    try {
      await deleteItem.mutateAsync(id);
      toast.success(t("settings.notifications.toasts.watchedItemDeleted"));
    } catch {
      toast.error(t("settings.notifications.toasts.error"));
    }
  };

  return (
    <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-green-500/10 p-2.5 shadow-inner shadow-green-500/10">
            <Eye className="size-4 text-green-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold leading-tight">
              {t("settings.notifications.watchedItems.title")}
            </h3>
            <p className="text-xs text-muted-foreground leading-tight">
              {t("settings.notifications.watchedItems.description")}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="size-3.5" />
          {t("settings.notifications.watchedItems.addItem")}
        </Button>
      </div>

      {isPending && (
        <p className="text-xs text-muted-foreground py-2">...</p>
      )}

      {!isPending && (!items || items.length === 0) && (
        <p className="text-xs text-muted-foreground py-2">
          {t("settings.notifications.watchedItems.noItems")}
        </p>
      )}

      {items?.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium truncate">
              {item.itemName}
            </span>
            <span className="text-xs text-muted-foreground">
              ID: {item.itemId}
            </span>
            {item.world && (
              <span className="text-xs text-muted-foreground">
                {item.world}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => handleDelete(item.id)}
            disabled={deleteItem.isPending}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ))}

      <AddWatchedItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={userId}
      />
    </Card>
  );
};
