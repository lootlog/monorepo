import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@lootlog/ui/components/input";
import { Switch } from "@lootlog/ui/components/switch";
import { ScoringField } from "./scoring-field";
import type { useScoringSimulator } from "./use-scoring-simulator";

type ScoringSimulatorManualInputsProps = {
  simulator: ReturnType<typeof useScoringSimulator>;
};

/** Hand-entered context values for the conditions that need no timeline. */
export const ScoringSimulatorManualInputs = ({
  simulator,
}: ScoringSimulatorManualInputsProps) => {
  const { t } = useTranslation();
  const fieldId = useId();

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
    killTimeStr,
    setKillTimeHour,
    setKillTimeMinute,
  } = simulator;

  return (
    <div className="grid gap-3">
      <p className="rounded-lg bg-muted/40 p-3 text-xs leading-snug text-muted-foreground">
        {t("events.scoring.simulator.manualNote")}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <ScoringField
          label={t("events.scoring.simulator.trackingPercent")}
          htmlFor={`${fieldId}-trackingPercent`}
        >
          <div className="flex items-center gap-1">
            <Input
              id={`${fieldId}-trackingPercent`}
              type="number"
              min={0}
              max={100}
              step={1}
              value={trackingPercent}
              onChange={(e) => setTrackingPercent(Number(e.target.value))}
              className="tabular-nums"
            />
            <span className="shrink-0 text-sm text-muted-foreground">%</span>
          </div>
        </ScoringField>
        <ScoringField
          label={t("events.scoring.simulator.assignedMembers")}
          htmlFor={`${fieldId}-assignedMembers`}
        >
          <Input
            id={`${fieldId}-assignedMembers`}
            type="number"
            min={1}
            step={1}
            value={assignedMembers}
            onChange={(e) => setAssignedMembers(Number(e.target.value))}
            className="tabular-nums"
          />
        </ScoringField>
        <ScoringField
          label={t("events.scoring.simulator.afkPercent")}
          htmlFor={`${fieldId}-afkPercent`}
        >
          <div className="flex items-center gap-1">
            <Input
              id={`${fieldId}-afkPercent`}
              type="number"
              min={0}
              max={100}
              step={1}
              value={afkPercent}
              onChange={(e) => setAfkPercent(Number(e.target.value))}
              className="tabular-nums"
            />
            <span className="shrink-0 text-sm text-muted-foreground">%</span>
          </div>
        </ScoringField>
        <ScoringField
          label={t("events.scoring.simulator.killTimeLabel")}
          htmlFor={`${fieldId}-killTimeLabel`}
        >
          <Input
            id={`${fieldId}-killTimeLabel`}
            type="time"
            value={killTimeStr}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":");
              setKillTimeHour(Number(h ?? 0));
              setKillTimeMinute(Number(m ?? 0));
            }}
            className="tabular-nums"
          />
        </ScoringField>
        <ScoringField
          label={t("events.scoring.simulator.respawnDuration")}
          htmlFor={`${fieldId}-respawnDuration`}
        >
          <div className="flex items-center gap-1">
            <Input
              id={`${fieldId}-respawnDuration`}
              type="number"
              min={1}
              step={1}
              value={respawnDurationMin}
              onChange={(e) => setRespawnDurationMin(Number(e.target.value))}
              className="tabular-nums"
            />
            <span className="shrink-0 text-sm text-muted-foreground">
              {t("events.scoring.simulator.minutesUnit")}
            </span>
          </div>
        </ScoringField>
        <ScoringField
          label={t("events.scoring.simulator.maxRespawnDuration")}
          htmlFor={`${fieldId}-maxRespawnDuration`}
        >
          <div className="flex items-center gap-1">
            <Input
              id={`${fieldId}-maxRespawnDuration`}
              type="number"
              min={1}
              step={1}
              value={maxRespawnDurationMin}
              onChange={(e) => setMaxRespawnDurationMin(Number(e.target.value))}
              className="tabular-nums"
            />
            <span className="shrink-0 text-sm text-muted-foreground">
              {t("events.scoring.simulator.minutesUnit")}
            </span>
          </div>
        </ScoringField>
        <ScoringField
          label={t("events.scoring.simulator.presentAtKill")}
          htmlFor={`${fieldId}-presentAtKill`}
        >
          <div className="flex items-center py-2">
            <Switch
              id={`${fieldId}-presentAtKill`}
              checked={presentAtKill}
              onCheckedChange={setPresentAtKill}
            />
          </div>
        </ScoringField>
        {!presentAtKill && (
          <ScoringField
            label={t("events.scoring.simulator.minutesSinceLeave")}
            htmlFor={`${fieldId}-minutesSinceLeave`}
            className="col-span-2"
          >
            <div className="flex items-center gap-1">
              <Input
                id={`${fieldId}-minutesSinceLeave`}
                type="number"
                min={0}
                step={1}
                value={minutesSinceLeave}
                onChange={(e) => setMinutesSinceLeave(Number(e.target.value))}
                className="w-32 tabular-nums"
              />
              <span className="shrink-0 text-sm text-muted-foreground">
                {t("events.scoring.simulator.minutesUnit")}
              </span>
            </div>
          </ScoringField>
        )}
        <ScoringField
          label={t("events.scoring.simulator.trackingDurationSeconds")}
          htmlFor={`${fieldId}-trackingDurationSeconds`}
        >
          <div className="flex items-center gap-1">
            <Input
              id={`${fieldId}-trackingDurationSeconds`}
              type="number"
              min={0}
              step={1}
              value={trackingDurationSecondsOverride}
              placeholder={t("events.scoring.simulator.auto")}
              onChange={(e) =>
                setTrackingDurationSecondsOverride(e.target.value)
              }
              className="tabular-nums"
            />
            <span className="shrink-0 text-sm text-muted-foreground">
              {t("events.scoring.simulator.secondsUnit")}
            </span>
          </div>
        </ScoringField>
        <ScoringField
          label={t("events.scoring.simulator.timeOnMapSeconds")}
          htmlFor={`${fieldId}-timeOnMapSeconds`}
        >
          <div className="flex items-center gap-1">
            <Input
              id={`${fieldId}-timeOnMapSeconds`}
              type="number"
              min={0}
              step={1}
              value={timeOnMapSecondsOverride}
              placeholder={t("events.scoring.simulator.auto")}
              onChange={(e) => setTimeOnMapSecondsOverride(e.target.value)}
              className="tabular-nums"
            />
            <span className="shrink-0 text-sm text-muted-foreground">
              {t("events.scoring.simulator.secondsUnit")}
            </span>
          </div>
        </ScoringField>
        <ScoringField
          label={t("events.scoring.simulator.wasPresent")}
          htmlFor={`${fieldId}-wasPresent`}
        >
          <div className="flex items-center py-2">
            <Switch
              id={`${fieldId}-wasPresent`}
              checked={wasPresent}
              onCheckedChange={setWasPresent}
            />
          </div>
        </ScoringField>
      </div>
    </div>
  );
};
