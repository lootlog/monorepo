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
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Input } from "@lootlog/ui/components/input";
import { RadioGroup, RadioGroupItem } from "@lootlog/ui/components/radio-group";
import { Loader2 } from "lucide-react";
import {
  formatRespawnDuration,
  calculateSpawnTimes,
} from "../hooks/utils/respawn-utils";

interface CloseRespawnWindowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heroName: string;
  defaultRespBaseSeconds: number;
  defaultRespRandomness: number;
  onConfirm: (options: {
    createNewWindow: boolean;
    newMinSpawnTime?: string;
    newMaxSpawnTime?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export const CloseRespawnWindowDialog = ({
  open,
  onOpenChange,
  heroName,
  defaultRespBaseSeconds,
  defaultRespRandomness,
  onConfirm,
  isLoading = false,
}: CloseRespawnWindowDialogProps) => {
  const { t } = useTranslation();
  const [createNewWindow, setCreateNewWindow] = useState(true);
  const [timeMode, setTimeMode] = useState<"default" | "custom">("default");
  const [customMinTime, setCustomMinTime] = useState("");
  const [customMaxTime, setCustomMaxTime] = useState("");

  const defaultDuration = formatRespawnDuration(defaultRespBaseSeconds);
  const { minSpawnTime, maxSpawnTime } = calculateSpawnTimes(
    defaultRespBaseSeconds,
    defaultRespRandomness,
  );

  const handleConfirm = async () => {
    let newMinSpawnTime: string | undefined;
    let newMaxSpawnTime: string | undefined;

    if (createNewWindow) {
      if (timeMode === "custom" && customMinTime && customMaxTime) {
        newMinSpawnTime = new Date(customMinTime).toISOString();
        newMaxSpawnTime = new Date(customMaxTime).toISOString();
      }
      // If default mode, backend will calculate times
    }

    await onConfirm({
      createNewWindow,
      newMinSpawnTime,
      newMaxSpawnTime,
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
            {t("events.respawn.closeWindow", "Zamknij okno respawnu")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "events.respawn.closeWindowDesc",
              "Zamknij aktywne okno respawnu dla herosa {{heroName}}. Ta akcja wyczyści wszystkie przypisania do map.",
              { heroName },
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="createNewWindow"
              checked={createNewWindow}
              onCheckedChange={(checked) =>
                setCreateNewWindow(checked === true)
              }
            />
            <Label htmlFor="createNewWindow" className="cursor-pointer">
              {t(
                "events.respawn.createNewWindow",
                "Utwórz nowe okno respawnu",
              )}
            </Label>
          </div>

          {createNewWindow && (
            <div className="space-y-4 pl-6 border-l-2 border-muted">
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
            variant="destructive"
            onClick={handleConfirm}
            disabled={
              isLoading ||
              (createNewWindow &&
                timeMode === "custom" &&
                (!customMinTime || !customMaxTime))
            }
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("events.respawn.closeWindowButton", "Zamknij okno")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
