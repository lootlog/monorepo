import type { ComponentProps } from "react";
import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
import { MapTemplateForm } from "./map-template-form";

type Props = ComponentProps<typeof MapTemplateForm> & { open: boolean };

export const MapTemplateFormDialog = ({ open, ...props }: Props) => (
  <Dialog open={open} onOpenChange={props.onOpenChange}>
    <DialogContent className="max-h-[90vh] sm:max-w-lg">
      <MapTemplateForm
        key={JSON.stringify(props.template ?? null)}
        {...props}
      />
    </DialogContent>
  </Dialog>
);
