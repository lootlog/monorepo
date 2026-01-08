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
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Input } from "@lootlog/ui/components/input";
import { Loader2, XCircle } from "lucide-react";

interface CloseRespawnWindowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heroName: string;
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
  onConfirm,
  isLoading = false,
}: CloseRespawnWindowDialogProps) => {
  const { t } = useTranslation();
  const [createNewWindow, setCreateNewWindow] = useState(true);
  const [minTime, setMinTime] = useState("");
  const [maxTime, setMaxTime] = useState("");

  const handleConfirm = async () => {
    let newMinSpawnTime: string | undefined;
    let newMaxSpawnTime: string | undefined;

    if (createNewWindow && minTime && maxTime) {
      newMinSpawnTime = new Date(minTime).toISOString();
      newMaxSpawnTime = new Date(maxTime).toISOString();
    }

    await onConfirm({
      createNewWindow,
      newMinSpawnTime,
      newMaxSpawnTime,
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setMinTime("");
      setMaxTime("");
      setCreateNewWindow(true);
    }
    onOpenChange(isOpen);
  };

  const isTimeRangeValid =
    !minTime || !maxTime || new Date(minTime) < new Date(maxTime);
  const isValid =
    !createNewWindow || (minTime && maxTime && isTimeRangeValid);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <XCircle className="size-4 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {t("events.respawn.closeWindow")}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {heroName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("events.respawn.closeWindowDesc")}
          </p>

          <div className="flex items-center gap-2">
            <Checkbox
              id="createNewWindow"
              checked={createNewWindow}
              onCheckedChange={(checked) =>
                setCreateNewWindow(checked === true)
              }
            />
            <Label htmlFor="createNewWindow" className="cursor-pointer text-sm">
              {t("events.respawn.createNewWindow")}
            </Label>
          </div>

          {createNewWindow && (
            <div className="space-y-4 pl-6 border-l-2 border-muted">
              <div className="space-y-2">
                <Label
                  htmlFor="minTime"
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {t("events.respawn.minSpawnTime")}
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
                  {t("events.respawn.maxSpawnTime")}
                </Label>
                <Input
                  id="maxTime"
                  type="datetime-local"
                  value={maxTime}
                  onChange={(e) => setMaxTime(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {minTime && maxTime && !isTimeRangeValid && (
                <p className="text-xs text-destructive">
                  {t("events.respawn.invalidTimeRange")}
                </p>
              )}
            </div>
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
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={isLoading || !isValid}
            className="flex-1"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("events.respawn.closeWindowButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
