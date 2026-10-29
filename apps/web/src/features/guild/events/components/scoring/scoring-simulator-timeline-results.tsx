import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { EventScoringRules } from "@lootlog/domain/scoring";
import { ChevronDown } from "lucide-react";
import { cn } from "cn";
import { formatPoints } from "../../utils/format-points";
import type { SimulationResult } from "../../utils/scoring-simulation";
import { ScoringPresenceBreakdown } from "../shared/scoring-presence-breakdown";

interface ScoringSimulatorTimelineResultsProps {
  result: SimulationResult;
  rules: EventScoringRules;
}

/** Points of every simulated participant, each expandable to its breakdown. */
export const ScoringSimulatorTimelineResults = ({
  result,
  rules,
}: ScoringSimulatorTimelineResultsProps) => {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const names = new Map(
    result.results.map((entry) => [
      entry.participant.id,
      entry.participant.name,
    ]),
  );

  const nameOf = (participantId: string | number) =>
    names.get(String(participantId)) ?? String(participantId);

  if (result.results.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("events.scoring.simulator.noParticipants")}
      </p>
    );
  }

  return (
    <ul className="grid gap-2">
      {result.results.map(({ participant, explanation }) => {
        const expanded =
          expandedId === participant.id ||
          (expandedId === null &&
            result.results[0]?.participant.id === participant.id);

        const { totalPoints, basePoints, bonusPoints } = explanation.result;
        const isCapped = basePoints + bonusPoints > totalPoints;

        return (
          <li key={participant.id} className="rounded-lg border border-border">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpandedId(expanded ? "" : participant.id)}
              className="flex w-full items-center gap-3 p-2.5 text-left hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {participant.name}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {t("events.scoring.simulator.pointsParts", {
                  base: formatPoints(basePoints),
                  bonus: formatPoints(bonusPoints),
                })}
              </span>
              <span
                className={cn(
                  "text-base font-bold tabular-nums text-primary",
                  isCapped && "text-amber-400",
                )}
              >
                {formatPoints(totalPoints)}
              </span>
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-[rotate] duration-200 ease-emphasized motion-reduce:transition-none",
                  expanded && "rotate-180",
                )}
              />
            </button>
            {expanded ? (
              <div className="border-t border-border p-2.5">
                <ScoringPresenceBreakdown
                  analysis={result.analysis}
                  participantId={participant.id}
                  explanation={explanation}
                  rules={rules.rules}
                  nameOf={nameOf}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};
