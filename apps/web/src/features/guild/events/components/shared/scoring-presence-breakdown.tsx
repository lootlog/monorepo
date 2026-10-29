import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import type {
  EventScoringExplanation,
  EventScoringRule,
} from "@lootlog/domain/scoring";
import type {
  EventKillPresence,
  PresenceParticipantId,
} from "@lootlog/domain/scoring-presence";
import { getPresenceFacts } from "../../utils/scoring-presence-presentation";
import { ScoringPresenceTimelineBar } from "./scoring-presence-timeline-bar";
import { ScoringRuleEvaluationList } from "./scoring-rule-evaluation-list";

interface ScoringPresenceBreakdownProps {
  analysis: EventKillPresence;
  participantId: PresenceParticipantId;
  explanation: EventScoringExplanation;
  rules: EventScoringRule[];
  nameOf: (participantId: PresenceParticipantId) => string;
}

/**
 * A member's presence in one respawn window and how each rule evaluated it,
 * shared by the kill breakdown and the simulator.
 */
export const ScoringPresenceBreakdown = ({
  analysis,
  participantId,
  explanation,
  rules,
  nameOf,
}: ScoringPresenceBreakdownProps) => {
  const { t } = useTranslation();
  const facts = getPresenceFacts(analysis, participantId, t);

  const items = [
    { label: t("events.scoring.presence.window"), value: facts.window },
    { label: t("events.scoring.presence.firstJoin"), value: facts.join },
    { label: t("events.scoring.presence.counted"), value: facts.counted },
    ...(facts.distribution
      ? [
          {
            label: t("events.scoring.presence.distribution"),
            value: facts.distribution,
          },
        ]
      : []),
  ];

  return (
    <div className="grid gap-3">
      <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
        {items.map((item) => (
          <Fragment key={item.label}>
            <dt className="text-muted-foreground">{item.label}</dt>
            <dd className="tabular-nums">{item.value}</dd>
          </Fragment>
        ))}
      </dl>
      <ScoringPresenceTimelineBar
        analysis={analysis}
        participantId={participantId}
        label={facts.distribution ?? facts.counted}
      />
      <ScoringRuleEvaluationList
        explanation={explanation}
        rules={rules}
        analysis={analysis}
        participantId={participantId}
        nameOf={nameOf}
      />
    </div>
  );
};
