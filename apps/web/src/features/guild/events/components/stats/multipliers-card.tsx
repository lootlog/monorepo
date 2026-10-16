import { BandSection } from "@/components/common/band-section";
import type { TFunction } from "i18next";
import type { EventConfig } from "../../hooks/queries/use-kill-detail";
import { ScoringRulesOverview } from "./scoring-rules-overview";

interface MultipliersCardProps {
  eventConfig: EventConfig;
  highlightedRuleIds?: string[];
  t: TFunction;
}

const EMPTY_RULE_IDS: string[] = [];

export const MultipliersCard = ({
  eventConfig,
  highlightedRuleIds = EMPTY_RULE_IDS,
  t,
}: MultipliersCardProps) => {
  const rules = eventConfig.scoringRules?.rules ?? [];

  return (
    <BandSection
      id="kill-scoring-rules"
      title={t("events.killDetail.multipliers.title")}
      count={eventConfig.scoringMode === "ADVANCED" ? rules.length : undefined}
      tiled
    >
      {eventConfig.scoringMode === "SIMPLE" ? (
        <p className="px-3 py-3 text-sm text-muted-foreground sm:px-4">
          {t("events.killDetail.multipliers.simpleMode")}
        </p>
      ) : (
        <ScoringRulesOverview
          scoringRules={eventConfig.scoringRules}
          highlightedRuleIds={highlightedRuleIds}
          t={t}
        />
      )}
    </BandSection>
  );
};
