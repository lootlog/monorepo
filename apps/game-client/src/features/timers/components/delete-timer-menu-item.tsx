import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmPopover } from "@/components/confirm-popover";
import { ContextMenuItem } from "@/components/ui/context-menu";

type DeleteTimerMenuItemProps = {
  timerName: string;
  onDelete: () => void;
};

/** A timer context menu entry that deletes the timer once confirmed. */
export const DeleteTimerMenuItem = ({
  timerName,
  onDelete,
}: DeleteTimerMenuItemProps) => {
  const { t } = useTranslation("timers");
  const [open, setOpen] = useState(false);

  return (
    <ConfirmPopover
      open={open}
      onOpenChange={setOpen}
      side="right"
      title={t("contextMenu.deleteConfirm.title", { name: timerName })}
      description={t("contextMenu.deleteConfirm.description")}
      confirmLabel={t("contextMenu.deleteConfirm.confirm")}
      onConfirm={() => {
        setOpen(false);
        onDelete();
      }}
      trigger={
        <ContextMenuItem
          className="ll:text-red-300 ll:hover:bg-red-500/20 ll:data-[highlighted]:bg-red-500/20 ll:focus-visible:bg-red-500/20"
          // Keeps the menu open while the confirmation is shown.
          onSelect={(event) => event.preventDefault()}
        >
          <Trash2 className="ll:h-4 ll:w-4 ll:mr-2" />
          {t("contextMenu.delete")}
        </ContextMenuItem>
      }
    />
  );
};
