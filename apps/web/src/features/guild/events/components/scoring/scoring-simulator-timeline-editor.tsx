import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Plus, Trash2, X } from "lucide-react";
import {
  SIMULATION_PRESETS,
  type SimulationParticipant,
  type SimulationTimeline,
} from "../../utils/scoring-simulation";
import { ScoringField } from "./scoring-field";

interface ScoringSimulatorTimelineEditorProps {
  timeline: SimulationTimeline;
  onChange: (timeline: SimulationTimeline) => void;
}

const makeId = () => Math.random().toString(36).slice(2, 10);

/** The simulated respawn window and every participant's presence intervals. */
export const ScoringSimulatorTimelineEditor = ({
  timeline,
  onChange,
}: ScoringSimulatorTimelineEditorProps) => {
  const { t } = useTranslation();
  const idPrefix = useId();

  const updateParticipant = (
    participantId: string,
    update: (participant: SimulationParticipant) => SimulationParticipant,
  ) =>
    onChange({
      ...timeline,
      participants: timeline.participants.map((participant) =>
        participant.id === participantId ? update(participant) : participant,
      ),
    });

  const addParticipant = () => {
    const id = makeId();

    onChange({
      ...timeline,
      participants: [
        ...timeline.participants,
        {
          id,
          name: t("events.scoring.simulator.participantName", {
            number: timeline.participants.length + 1,
          }),
          intervals: [
            { id: makeId(), from: timeline.windowStart, to: timeline.killTime },
          ],
        },
      ],
    });
  };

  const clocks = [
    { key: "windowStart", label: t("events.scoring.simulator.windowStart") },
    { key: "killTime", label: t("events.scoring.simulator.killTimeLabel") },
    { key: "maxRespawn", label: t("events.scoring.simulator.maxRespawn") },
  ] as const;

  return (
    <div className="grid content-start gap-4">
      <div className="grid gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {t("events.scoring.simulator.presets")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SIMULATION_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChange(structuredClone(preset.timeline))}
            >
              {t(`events.scoring.simulator.preset.${preset.id}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {clocks.map((clock) => (
          <ScoringField
            key={clock.key}
            label={clock.label}
            htmlFor={`${idPrefix}-${clock.key}`}
          >
            <Input
              id={`${idPrefix}-${clock.key}`}
              type="time"
              className="tabular-nums"
              value={timeline[clock.key]}
              onChange={(event) =>
                onChange({ ...timeline, [clock.key]: event.target.value })
              }
            />
          </ScoringField>
        ))}
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {t("events.scoring.simulator.participants")}
        </p>
        {timeline.participants.map((participant, participantIndex) => (
          <div
            key={participant.id}
            className="grid gap-2 rounded-lg border border-border p-2.5"
          >
            <div className="flex items-center gap-2">
              <Input
                value={participant.name}
                onChange={(event) =>
                  updateParticipant(participant.id, (current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="min-w-0 flex-1 font-medium"
                aria-label={t("events.scoring.simulator.participantNameLabel", {
                  number: participantIndex + 1,
                })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={() =>
                  onChange({
                    ...timeline,
                    participants: timeline.participants.filter(
                      (current) => current.id !== participant.id,
                    ),
                  })
                }
                aria-label={t("events.scoring.simulator.removeParticipant", {
                  name: participant.name,
                })}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            {participant.intervals.map((interval, intervalIndex) => (
              <div key={interval.id} className="flex items-center gap-2">
                {(["from", "to"] as const).map((edge) => (
                  <Input
                    key={edge}
                    type="time"
                    className="w-28 tabular-nums"
                    value={interval[edge]}
                    onChange={(event) =>
                      updateParticipant(participant.id, (current) => ({
                        ...current,
                        intervals: current.intervals.map((entry) =>
                          entry.id === interval.id
                            ? { ...entry, [edge]: event.target.value }
                            : entry,
                        ),
                      }))
                    }
                    aria-label={t(`events.scoring.simulator.interval.${edge}`, {
                      name: participant.name,
                      number: intervalIndex + 1,
                    })}
                  />
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  onClick={() =>
                    updateParticipant(participant.id, (current) => ({
                      ...current,
                      intervals: current.intervals.filter(
                        (entry) => entry.id !== interval.id,
                      ),
                    }))
                  }
                  aria-label={t("events.scoring.simulator.interval.remove", {
                    name: participant.name,
                    number: intervalIndex + 1,
                  })}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() =>
                  updateParticipant(participant.id, (current) => ({
                    ...current,
                    intervals: [
                      ...current.intervals,
                      {
                        id: makeId(),
                        from: timeline.windowStart,
                        to: timeline.killTime,
                      },
                    ],
                  }))
                }
              >
                <Plus className="size-4" />
                {t("events.scoring.simulator.interval.add")}
              </Button>
            </div>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addParticipant}
          >
            <Plus className="size-4" />
            {t("events.scoring.simulator.addParticipant")}
          </Button>
        </div>
      </div>
    </div>
  );
};
