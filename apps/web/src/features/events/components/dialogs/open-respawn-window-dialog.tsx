import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@lootlog/ui/components/dialog";
import { Button } from "@lootlog/ui/components/button";
import { Label } from "@lootlog/ui/components/label";
import { DateTimePicker } from "@lootlog/ui/components/date-time-picker";
import { Loader2, Timer } from "lucide-react";

interface OpenRespawnWindowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heroName: string;
  onConfirm: (options: {
    minSpawnTime: string;
    maxSpawnTime: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export const OpenRespawnWindowDialog = ({
  open,
  onOpenChange,
  heroName,
  onConfirm,
  isLoading = false,
}: OpenRespawnWindowDialogProps) => {
  const { t } = useTranslation();
  const [minTime, setMinTime] = useState<Date | undefined>(() => new Date());
  const [maxTime, setMaxTime] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setHours(date.getHours() + 3);
    return date;
  });

  const handleConfirm = async () => {
    if (!minTime || !maxTime) return;

    await onConfirm({
      minSpawnTime: minTime.toISOString(),
      maxSpawnTime: maxTime.toISOString(),
    });

    const now = new Date();
    const later = new Date();
    later.setHours(later.getHours() + 3);
    setMinTime(now);
    setMaxTime(later);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      const now = new Date();
      const later = new Date();
      later.setHours(later.getHours() + 3);
      setMinTime(now);
      setMaxTime(later);
    }
    onOpenChange(isOpen);
  };

  const isValid = minTime && maxTime && minTime < maxTime;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Timer className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {t("events.respawn.openWindow", "Otwórz okno respawnu")}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {heroName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("events.respawn.minSpawnTime", "Minimalny czas spawnu")}
            </Label>
            <DateTimePicker
              value={minTime}
              onChange={setMinTime}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("events.respawn.maxSpawnTime", "Maksymalny czas spawnu")}
            </Label>
            <DateTimePicker
              value={maxTime}
              onChange={setMaxTime}
              className="w-full"
            />
          </div>

          {minTime && maxTime && minTime >= maxTime && (
            <p className="text-xs text-destructive">
              {t(
                "events.respawn.invalidTimeRange",
                "Minimalny czas musi być przed maksymalnym",
              )}
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t bg-muted/30 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            className="flex-1"
          >
            {t("common.cancel", "Anuluj")}
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isLoading || !isValid}
            className="flex-1"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("events.respawn.openWindowButton", "Otwórz okno")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
