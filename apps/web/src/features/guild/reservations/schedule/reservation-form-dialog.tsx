import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
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
import { useTranslation } from "react-i18next";
import type { ReservationSettings } from "@lootlog/domain/reservations";
import { ReservationForm } from "./reservation-form";

type ReservationFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guildId: string;
  spotId: string;
  settings: ReservationSettings;
  initialStartsAt?: Date;
  initialEndsAt?: Date;
};

export function ReservationFormDialog({
  open,
  onOpenChange,
  guildId,
  spotId,
  settings,
  initialStartsAt,
  initialEndsAt,
}: ReservationFormDialogProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const form = (
    <ReservationForm
      key={`${initialStartsAt?.toISOString() ?? "empty"}:${initialEndsAt?.toISOString() ?? "empty"}:${open}`}
      guildId={guildId}
      spotId={spotId}
      settings={settings}
      initialStartsAt={initialStartsAt}
      initialEndsAt={initialEndsAt}
      onCancel={() => onOpenChange(false)}
      onSuccess={() => onOpenChange(false)}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92dvh] p-0">
          <DrawerHeader className="border-b text-left">
            <DrawerTitle>{t("reservations.schedule.dialog.title")}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="min-h-0 px-4 py-4">{form}</ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("reservations.schedule.dialog.title")}</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-4 pt-4">{form}</div>
      </DialogContent>
    </Dialog>
  );
}
