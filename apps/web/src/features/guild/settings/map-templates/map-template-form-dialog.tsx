import type { ComponentProps } from "react";
import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
import { MapTemplateForm } from "./map-template-form";

type Props = ComponentProps<typeof MapTemplateForm> & { open: boolean };

export const MapTemplateFormDialog = ({ open, ...props }: Props) => (
  <Dialog open={open} onOpenChange={props.onOpenChange}>
    <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh]">
      <MapTemplateForm
        key={JSON.stringify(props.template ?? null)}
        {...props}
      />
    </DialogContent>
  </Dialog>
);
