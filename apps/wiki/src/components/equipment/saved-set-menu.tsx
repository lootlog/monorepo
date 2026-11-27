import { type Ref, useState } from "react";
import { MoreHorizontal, Pencil, Save, Trash2 } from "lucide-react";
import type { UserEquipmentSetResponseDto } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useSavedEquipmentSetMutations } from "@/hooks/use-saved-equipment-sets";
import { t } from "@/i18n/messages";
import { encodeEquipmentSet } from "@/lib/equipment-set";

type SavedSetMenuProps = {
  saved: UserEquipmentSetResponseDto;
  triggerRef: Ref<HTMLButtonElement>;
  onEdit: () => void;
  onDeleted: () => void;
};

type Confirmation = "overwrite" | "delete";

export function SavedSetMenu({
  saved,
  triggerRef,
  onEdit,
  onDeleted,
}: SavedSetMenuProps) {
  const { set } = useEquipmentSet();
  const { update, remove } = useSavedEquipmentSetMutations();
  const [confirming, setConfirming] = useState<Confirmation | null>(null);

  const confirm = async () => {
    if (confirming === "delete") {
      await remove.mutateAsync({ pathParams: { setId: saved.id } });
      onDeleted();
    } else {
      await update.mutateAsync({
        pathParams: { setId: saved.id },
        data: { code: encodeEquipmentSet(set) },
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              ref={triggerRef}
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t("savedSets.more", { name: saved.name })}
            />
          }
        >
          <MoreHorizontal aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil aria-hidden="true" />
            {t("savedSets.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirming("overwrite")}>
            <Save aria-hidden="true" />
            {t("savedSets.overwrite")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirming("delete")}
          >
            <Trash2 aria-hidden="true" />
            {t("savedSets.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        variant={confirming === "delete" ? "destructive" : "default"}
        title={
          confirming === "delete"
            ? t("savedSets.deleteTitle", { name: saved.name })
            : t("savedSets.overwriteTitle", { name: saved.name })
        }
        description={
          update.isError || remove.isError
            ? t("savedSets.saveFailed")
            : confirming === "delete"
              ? t("savedSets.deleteDescription")
              : t("savedSets.overwriteDescription")
        }
        confirmButtonLabel={
          confirming === "delete"
            ? t("savedSets.delete")
            : t("savedSets.overwrite")
        }
        cancelButtonLabel={t("savedSets.cancel")}
        pending={update.isPending || remove.isPending}
        onConfirm={confirm}
      />
    </>
  );
}
