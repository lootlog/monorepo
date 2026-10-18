import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { CalendarPlus } from "lucide-react";
import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useTranslation } from "react-i18next";
import type { ReservationSettings } from "@lootlog/domain/reservations";
import { ReservationForm } from "./reservation-form";

type ReservationFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guildId: string;
  spotId: string;
  spotName: string;
  settings: ReservationSettings;
  initialStartsAt?: Date;
  initialEndsAt?: Date;
};

export function ReservationFormDialog({
  open,
  onOpenChange,
  guildId,
  spotId,
  spotName,
  settings,
  initialStartsAt,
  initialEndsAt,
}: ReservationFormDialogProps) {
  const { t } = useTranslation();
  const title = t("reservations.schedule.dialog.title");

  const description = t("reservations.schedule.dialog.description", {
    spot: spotName,
  });

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
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="min-h-0 p-4">{form}</ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <IconDialogHeader
          icon={CalendarPlus}
          title={title}
          description={description}
        />
        <div className="p-5">{form}</div>
      </DialogContent>
    </Dialog>
  );
}
