import { useScoringSimulator } from "./use-scoring-simulator";
import { ScoringSimulatorResults } from "./scoring-simulator-results";
import { ScoringSimulatorRuleToggles } from "./scoring-simulator-rule-toggles";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Switch } from "@lootlog/ui/components/switch";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Separator } from "@lootlog/ui/components/separator";
import type { EventScoringRules } from "@lootlog/domain/scoring";

interface ScoringSimulatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scoringRules: EventScoringRules;
}

export const ScoringSimulatorDialog = ({
  open,
  onOpenChange,
  scoringRules,
}: ScoringSimulatorDialogProps) => {
  const { t } = useTranslation();

  const {
    trackingPercent,
    setTrackingPercent,
    assignedMembers,
    setAssignedMembers,
    presentAtKill,
    setPresentAtKill,
    afkPercent,
    setAfkPercent,
    minutesSinceLeave,
    setMinutesSinceLeave,
    respawnDurationMin,
    setRespawnDurationMin,
    maxRespawnDurationMin,
    setMaxRespawnDurationMin,
    trackingDurationSecondsOverride,
    setTrackingDurationSecondsOverride,
    timeOnMapSecondsOverride,
    setTimeOnMapSecondsOverride,
    wasPresent,
    setWasPresent,
    ruleOverrides,
    toggleRule,
    result,
    killTimeStr,
    setKillTimeHour,
    setKillTimeMinute,
  } = useScoringSimulator(scoringRules);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-3 border-b bg-muted/30 shrink-0">
          <DialogTitle className="text-base">
            {t("events.scoring.simulator.dialogTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("events.scoring.simulator.dialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Results - prominent at the top */}
            <ScoringSimulatorResults
              result={result}
              hardCapPoints={scoringRules.hardCapPoints}
            />

            <Separator className="opacity-30" />

            {/* Context inputs */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground mb-2">
                {t("events.scoring.simulator.context")}
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <div className="space-y-0.5">
                  <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    {t("events.scoring.simulator.trackingPercent")}
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={trackingPercent}
                      onChange={(e) =>
                        setTrackingPercent(Number(e.target.value))
                      }
                      className="h-8 text-[12px] font-mono"
                    />
                    <span className="text-[11px] text-muted-foreground/50 shrink-0 font-mono">
                      %
                    </span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    {t("events.scoring.simulator.assignedMembers")}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={assignedMembers}
                    onChange={(e) => setAssignedMembers(Number(e.target.value))}
                    className="h-8 text-[12px] font-mono"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    {t("events.scoring.simulator.afkPercent")}
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={afkPercent}
                      onChange={(e) => setAfkPercent(Number(e.target.value))}
                      className="h-8 text-[12px] font-mono"
                    />
                    <span className="text-[11px] text-muted-foreground/50 shrink-0 font-mono">
                      %
                    </span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    {t("events.scoring.simulator.killTimeLabel")}
                  </Label>
                  <Input
                    type="time"
                    value={killTimeStr}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(":");
                      setKillTimeHour(Number(h ?? 0));
                      setKillTimeMinute(Number(m ?? 0));
                    }}
                    className="h-8 text-[12px] font-mono"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    {t("events.scoring.simulator.respawnDuration")}
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={respawnDurationMin}
                      onChange={(e) =>
                        setRespawnDurationMin(Number(e.target.value))
                      }
                      className="h-8 text-[12px] font-mono"
                    />
                    <span className="text-[11px] text-muted-foreground/50 shrink-0">
                      min
                    </span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    {t("events.scoring.simulator.maxRespawnDuration")}
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={maxRespawnDurationMin}
                      onChange={(e) =>
                        setMaxRespawnDurationMin(Number(e.target.value))
                      }
                      className="h-8 text-[12px] font-mono"
                    />
                    <span className="text-[11px] text-muted-foreground/50 shrink-0">
                      min
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    {t("events.scoring.simulator.presentAtKill")}
                  </Label>
                  <div className="flex items-center h-8">
                    <Switch
                      checked={presentAtKill}
                      onCheckedChange={setPresentAtKill}
                    />
                  </div>
                </div>
                {!presentAtKill && (
                  <div className="space-y-0.5 col-span-2">
                    <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
                      {t("events.scoring.simulator.minutesSinceLeave")}
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={minutesSinceLeave}
                        onChange={(e) =>
                          setMinutesSinceLeave(Number(e.target.value))
                        }
                        className="h-8 text-[12px] font-mono w-32"
                      />
                      <span className="text-[11px] text-muted-foreground/50 shrink-0">
                        min
                      </span>
                    </div>
                  </div>
                )}
                <div className="space-y-0.5">
                  <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    {t("events.scoring.simulator.trackingDurationSeconds")}
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={trackingDurationSecondsOverride}
                      placeholder={t("events.scoring.simulator.auto")}
                      onChange={(e) =>
                        setTrackingDurationSecondsOverride(e.target.value)
                      }
                      className="h-8 text-[12px] font-mono"
                    />
                    <span className="text-[11px] text-muted-foreground/50 shrink-0">
                      sek
                    </span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    {t("events.scoring.simulator.timeOnMapSeconds")}
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={timeOnMapSecondsOverride}
                      placeholder={t("events.scoring.simulator.auto")}
                      onChange={(e) =>
                        setTimeOnMapSecondsOverride(e.target.value)
                      }
                      className="h-8 text-[12px] font-mono"
                    />
                    <span className="text-[11px] text-muted-foreground/50 shrink-0">
                      sek
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    {t("events.scoring.simulator.wasPresent")}
                  </Label>
                  <div className="flex items-center h-8">
                    <Switch
                      checked={wasPresent}
                      onCheckedChange={setWasPresent}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator className="opacity-30" />

            {/* Rule toggles */}
            <ScoringSimulatorRuleToggles
              rules={scoringRules.rules}
              overrides={ruleOverrides}
              appliedRules={result.appliedRules}
              onToggle={toggleRule}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
