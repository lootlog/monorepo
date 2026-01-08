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
import { Input } from "@lootlog/ui/components/input";
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
  const [minTime, setMinTime] = useState("");
  const [maxTime, setMaxTime] = useState("");

  const handleConfirm = async () => {
    if (!minTime || !maxTime) return;

    await onConfirm({
      minSpawnTime: new Date(minTime).toISOString(),
      maxSpawnTime: new Date(maxTime).toISOString(),
    });

    setMinTime("");
    setMaxTime("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setMinTime("");
      setMaxTime("");
    }
    onOpenChange(isOpen);
  };

  const isValid = minTime && maxTime && new Date(minTime) < new Date(maxTime);

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
            <Label
              htmlFor="minTime"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              {t("events.respawn.minSpawnTime", "Minimalny czas spawnu")}
            </Label>
            <Input
              id="minTime"
              type="datetime-local"
              value={minTime}
              onChange={(e) => setMinTime(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="maxTime"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              {t("events.respawn.maxSpawnTime", "Maksymalny czas spawnu")}
            </Label>
            <Input
              id="maxTime"
              type="datetime-local"
              value={maxTime}
              onChange={(e) => setMaxTime(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {minTime && maxTime && new Date(minTime) >= new Date(maxTime) && (
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
