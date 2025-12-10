import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@lootlog/ui/components/dialog";
import { Button } from "@lootlog/ui/components/button";
import { Label } from "@lootlog/ui/components/label";
import { Input } from "@lootlog/ui/components/input";
import { RadioGroup, RadioGroupItem } from "@lootlog/ui/components/radio-group";
import { Loader2 } from "lucide-react";
import {
  formatRespawnDuration,
  calculateSpawnTimes,
} from "../hooks/utils/respawn-utils";

interface OpenRespawnWindowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heroName: string;
  defaultRespBaseSeconds: number;
  defaultRespRandomness: number;
  onConfirm: (options: {
    minSpawnTime?: string;
    maxSpawnTime?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export const OpenRespawnWindowDialog = ({
  open,
  onOpenChange,
  heroName,
  defaultRespBaseSeconds,
  defaultRespRandomness,
  onConfirm,
  isLoading = false,
}: OpenRespawnWindowDialogProps) => {
  const { t } = useTranslation();
  const [timeMode, setTimeMode] = useState<"default" | "custom">("default");
  const [customMinTime, setCustomMinTime] = useState("");
  const [customMaxTime, setCustomMaxTime] = useState("");

  const defaultDuration = formatRespawnDuration(defaultRespBaseSeconds);
  const { minSpawnTime, maxSpawnTime } = calculateSpawnTimes(
    defaultRespBaseSeconds,
    defaultRespRandomness,
  );

  const handleConfirm = async () => {
    let minTime: string | undefined;
    let maxTime: string | undefined;

    if (timeMode === "custom" && customMinTime && customMaxTime) {
      minTime = new Date(customMinTime).toISOString();
      maxTime = new Date(customMaxTime).toISOString();
    }
    // If default mode, backend will calculate times

    await onConfirm({
      minSpawnTime: minTime,
      maxSpawnTime: maxTime,
    });
  };

  const formatDateTime = (date: Date): string => {
    return date.toLocaleString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("events.respawn.openWindow", "Otwórz okno respawnu")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "events.respawn.openWindowDesc",
              "Ręcznie otwórz nowe okno respawnu dla herosa {{heroName}}.",
              { heroName },
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={timeMode}
            onValueChange={(value: string) =>
              setTimeMode(value as "default" | "custom")
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="default" id="default" />
              <Label htmlFor="default" className="cursor-pointer">
                {t("events.respawn.useDefaultTimes", "Użyj domyślnych czasów")}
                <span className="text-muted-foreground text-sm ml-2">
                  (~{defaultDuration} ± {defaultRespRandomness}%)
                </span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom" className="cursor-pointer">
                {t("events.respawn.useCustomTimes", "Podaj własne czasy")}
              </Label>
            </div>
          </RadioGroup>

          {timeMode === "default" && (
            <p className="text-sm text-muted-foreground">
              {t("events.respawn.defaultTimesPreview", "Przewidywany czas: {{min}} - {{max}}", {
                min: formatDateTime(minSpawnTime),
                max: formatDateTime(maxSpawnTime),
              })}
            </p>
          )}

          {timeMode === "custom" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="minTime">
                  {t("events.respawn.minSpawnTime", "Minimalny czas spawnu")}
                </Label>
                <Input
                  id="minTime"
                  type="datetime-local"
                  value={customMinTime}
                  onChange={(e) => setCustomMinTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTime">
                  {t("events.respawn.maxSpawnTime", "Maksymalny czas spawnu")}
                </Label>
                <Input
                  id="maxTime"
                  type="datetime-local"
                  value={customMaxTime}
                  onChange={(e) => setCustomMaxTime(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t("common.cancel", "Anuluj")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              isLoading ||
              (timeMode === "custom" && (!customMinTime || !customMaxTime))
            }
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("events.respawn.openWindowButton", "Otwórz okno")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
