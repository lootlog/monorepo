import { useState } from "react";
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
import { Badge } from "@lootlog/ui/components/badge";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Separator } from "@lootlog/ui/components/separator";
import { CheckCircle2, XCircle, Trophy, Minus } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import type { EventScoringRules } from "../../types/scoring-rules";
import {
  evaluateEventScoring,
  type EvaluationContext,
} from "../../utils/scoring-applied-rules";

interface ScoringSimulatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scoringRules: EventScoringRules;
}

function buildContext(params: {
  trackingPercent: number;
  trackingDurationSeconds: number | null;
  assignedMembers: number;
  presentAtKill: boolean;
  afkPercent: number;
  killTimeHour: number;
  killTimeMinute: number;
  minutesSinceLeave: number;
  respawnDurationMin: number;
  maxRespawnDurationMin: number;
  timeOnMapSeconds: number | null;
  wasPresent: boolean;
  timezone: string;
}): EvaluationContext {
  const respawnDurationSeconds = params.respawnDurationMin * 60;
  const maxRespawnDurationSeconds = params.maxRespawnDurationMin * 60;
  const derivedTrackingSeconds =
    (params.trackingPercent / 100) * respawnDurationSeconds;
  const trackingSeconds =
    params.trackingDurationSeconds ?? derivedTrackingSeconds;
  const derivedTimeOnMap = trackingSeconds * (1 - params.afkPercent / 100);
  const timeOnMapSeconds = params.timeOnMapSeconds ?? derivedTimeOnMap;

  const now = new Date();
  const killTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    params.killTimeHour,
    params.killTimeMinute,
    0,
    0,
  );
  const respawnStartTime = new Date(
    killTime.getTime() - respawnDurationSeconds * 1000,
  );

  const minutesSinceLeaveToKill = params.presentAtKill
    ? null
    : params.minutesSinceLeave;

  const respawnProgressPercentage =
    maxRespawnDurationSeconds > 0
      ? Math.round(
          (Math.min(respawnDurationSeconds, maxRespawnDurationSeconds) /
            maxRespawnDurationSeconds) *
            100,
        )
      : undefined;

  return {
    trackingDurationPercentage: params.trackingPercent,
    trackingDurationSeconds: trackingSeconds,
    assignedMembersCount: params.assignedMembers,
    killTime,
    respawnStartTime,
    respawnDurationSeconds,
    respawnProgressPercentage,
    minutesSinceLeaveToKill,
    memberPresentAtKill: params.presentAtKill,
    timeOnMapSeconds,
    afkPercentage: params.afkPercent,
    wasPresent: params.wasPresent,
  };
}

export const ScoringSimulatorDialog = ({
  open,
  onOpenChange,
  scoringRules,
}: ScoringSimulatorDialogProps) => {
  const { t } = useTranslation();

  const [trackingPercent, setTrackingPercent] = useState(80);
  const [assignedMembers, setAssignedMembers] = useState(3);
  const [presentAtKill, setPresentAtKill] = useState(true);
  const [afkPercent, setAfkPercent] = useState(0);
  const [killTimeHour, setKillTimeHour] = useState(10);
  const [killTimeMinute, setKillTimeMinute] = useState(0);
  const [minutesSinceLeave, setMinutesSinceLeave] = useState(5);
  const [respawnDurationMin, setRespawnDurationMin] = useState(120);
  const [maxRespawnDurationMin, setMaxRespawnDurationMin] = useState(180);
  const [trackingDurationSecondsOverride, setTrackingDurationSecondsOverride] =
    useState<string>("");
  const [timeOnMapSecondsOverride, setTimeOnMapSecondsOverride] =
    useState<string>("");
  const [wasPresent, setWasPresent] = useState(true);

  const [ruleOverrides, setRuleOverrides] = useState<Record<string, boolean>>(
    {},
  );

  const toggleRule = (ruleId: string, currentEnabled: boolean) => {
    setRuleOverrides((prev) => ({ ...prev, [ruleId]: !currentEnabled }));
  };

  const rulesWithOverrides: EventScoringRules = {
    ...scoringRules,
    rules: scoringRules.rules.map((rule) => ({
      ...rule,
      enabled: ruleOverrides[rule.id] ?? rule.enabled !== false,
    })),
  };

  const context = buildContext({
    trackingPercent,
    trackingDurationSeconds:
      trackingDurationSecondsOverride !== ""
        ? Number(trackingDurationSecondsOverride)
        : null,
    assignedMembers,
    presentAtKill,
    afkPercent,
    killTimeHour,
    killTimeMinute,
    minutesSinceLeave,
    respawnDurationMin,
    maxRespawnDurationMin,
    timeOnMapSeconds:
      timeOnMapSecondsOverride !== "" ? Number(timeOnMapSecondsOverride) : null,
    wasPresent,
    timezone: scoringRules.timezone,
  });

  const result = evaluateEventScoring(rulesWithOverrides, context);
  const isCapped =
    result.basePoints + result.bonusPoints > scoringRules.hardCapPoints;

  const killTimeStr = `${String(killTimeHour).padStart(2, "0")}:${String(killTimeMinute).padStart(2, "0")}`;

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
            {/* Results — prominent at the top */}
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="size-3.5 text-amber-500" />
                <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
                  {t("events.scoring.simulator.results")}
                </span>
              </div>
              <div className="flex items-baseline gap-4">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground/60">
                    {t("events.scoring.simulator.base")}
                  </p>
                  <p className="text-lg font-mono font-bold">
                    {result.basePoints.toFixed(2)}
                  </p>
                </div>
                <span className="text-muted-foreground/40 text-lg">+</span>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground/60">
                    {t("events.scoring.simulator.bonus")}
                  </p>
                  <p className="text-lg font-mono font-bold text-green-400">
                    {result.bonusPoints.toFixed(2)}
                  </p>
                </div>
                <span className="text-muted-foreground/40 text-lg">=</span>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground/60">
                    {t("events.scoring.simulator.total")}
                  </p>
                  <p
                    className={cn(
                      "text-xl font-mono font-bold",
                      isCapped && "text-amber-400",
                    )}
                  >
                    {result.totalPoints.toFixed(2)}
                    {isCapped && (
                      <span className="text-[10px] font-normal text-amber-400/70 ml-1">
                        {t("events.scoring.simulator.capped")}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {result.appliedRules.length > 0 ? (
                <div className="mt-2 pt-2 border-t border-border/40">
                  <p className="text-[10px] text-muted-foreground/60 mb-1">
                    {t("events.scoring.simulator.firedRules")}:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {result.appliedRules.map((rule) => (
                      <Badge
                        key={rule.ruleId}
                        variant="outline"
                        className={cn(
                          "text-[10px] font-normal",
                          rule.actionType === "SET_BASE" &&
                            "border-blue-500/30 text-blue-400",
                          rule.actionType === "ADD_BONUS" &&
                            "border-green-500/30 text-green-400",
                          rule.actionType === "ZERO_BASE" &&
                            "border-red-500/30 text-red-400",
                        )}
                      >
                        {rule.ruleName ?? rule.ruleId}
                        {rule.actionType !== "ZERO_BASE" && (
                          <span className="ml-1 font-mono">
                            {rule.actionType === "SET_BASE" ? "=" : "+"}
                            {rule.points}
                          </span>
                        )}
                        {rule.actionType === "ZERO_BASE" && (
                          <span className="ml-1">= 0</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground/50">
                  {t("events.scoring.simulator.noRulesFired")}
                </p>
              )}
            </div>

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
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground mb-2">
                {t("events.scoring.simulator.activeRules")}
              </p>
              <div className="space-y-1">
                {scoringRules.rules.map((rule) => {
                  const isActive =
                    ruleOverrides[rule.id] ?? rule.enabled !== false;
                  const fired = result.appliedRules.some(
                    (r) => r.ruleId === rule.id,
                  );
                  return (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => toggleRule(rule.id, isActive)}
                      className={cn(
                        "flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-left transition-colors cursor-pointer",
                        isActive
                          ? "bg-card hover:bg-card"
                          : "opacity-40 hover:opacity-60",
                      )}
                    >
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => toggleRule(rule.id, isActive)}
                        className="pointer-events-none"
                      />
                      <span className="text-[12px] flex-1 truncate">
                        {rule.name || t("events.scoring.unnamedRule")}
                      </span>
                      {isActive &&
                        (fired ? (
                          <CheckCircle2 className="size-3.5 text-green-400 shrink-0" />
                        ) : (
                          <Minus className="size-3.5 text-muted-foreground/30 shrink-0" />
                        ))}
                      {!isActive && (
                        <XCircle className="size-3.5 text-muted-foreground/30 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
