import type { ComponentProps } from "react";
import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
import { WatchFormDialogContent } from "./watch-item-form-dialog-content";

type Props = ComponentProps<typeof WatchFormDialogContent> & { open: boolean };

export function WatchFormDialog({ open, onOpenChange, ...props }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <WatchFormDialogContent {...props} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}
