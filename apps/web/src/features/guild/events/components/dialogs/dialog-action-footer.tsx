import type { ReactNode } from "react";
import { Button } from "@lootlog/ui/components/button";
import { DialogFooter } from "@lootlog/ui/components/dialog";

type DialogActionFooterProps = {
  cancelLabel: string;
  confirmForm?: string;
  confirmIcon?: ReactNode;
  confirmLabel: ReactNode;
  confirmType?: "button" | "submit";
  confirmVariant?: "default" | "destructive";
  isPending: boolean;
  onCancel: () => void;
  onConfirm?: () => void;
};

export const DialogActionFooter = ({
  cancelLabel,
  confirmForm,
  confirmIcon,
  confirmLabel,
  confirmType = "submit",
  confirmVariant,
  isPending,
  onCancel,
  onConfirm,
}: DialogActionFooterProps) => (
  <DialogFooter>
    <Button
      type="button"
      variant="outline"
      onClick={onCancel}
      disabled={isPending}
    >
      {cancelLabel}
    </Button>
    <Button
      type={confirmType}
      form={confirmForm}
      loading={isPending}
      variant={confirmVariant}
      disabled={isPending}
      icon={confirmIcon}
      onClick={onConfirm}
    >
      {confirmLabel}
    </Button>
  </DialogFooter>
);
