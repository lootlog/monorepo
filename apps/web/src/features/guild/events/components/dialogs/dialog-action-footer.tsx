import type { ReactNode } from "react";
import { Button } from "@lootlog/ui/components/button";

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
  <div className="px-5 py-3 border-t bg-muted/30 flex gap-2">
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onCancel}
      disabled={isPending}
      className="flex-1"
    >
      {cancelLabel}
    </Button>
    <Button
      type={confirmType}
      form={confirmForm}
      loading={isPending}
      variant={confirmVariant}
      size="sm"
      disabled={isPending}
      icon={confirmIcon}
      onClick={onConfirm}
      className="flex-1"
    >
      {confirmLabel}
    </Button>
  </div>
);
