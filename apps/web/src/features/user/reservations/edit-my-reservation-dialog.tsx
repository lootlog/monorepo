import { useTranslation } from "react-i18next";
import type { MyReservationsResponseDtoItemsItem } from "@lootlog/api-client/models/main/my-reservations-response-dto-items-item";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { EditMyReservationForm } from "./edit-my-reservation-form";

type EditMyReservationDialogProps = {
  reservation: MyReservationsResponseDtoItemsItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditMyReservationDialog({
  reservation,
  open,
  onOpenChange,
}: EditMyReservationDialogProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const dialogOpen = open && reservation !== null;
  const form = reservation ? (
    <EditMyReservationForm
      key={reservation.id}
      reservation={reservation}
      onCancel={() => onOpenChange(false)}
      onSuccess={() => onOpenChange(false)}
    />
  ) : null;

  if (isMobile) {
    return (
      <Drawer open={dialogOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92dvh] p-0">
          <DrawerHeader className="border-b text-left">
            <DrawerTitle>{t("reservations.my.editDialogTitle")}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="min-h-0 px-4 py-4">{form}</ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader className="border-b pb-3">
          <DialogTitle>{t("reservations.my.editDialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-4 pt-4">{form}</div>
      </DialogContent>
    </Dialog>
  );
}
