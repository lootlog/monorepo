import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import type { TFunction } from "i18next";
import { Calculator } from "lucide-react";
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
    <SectionCard className="overflow-hidden bg-card">
      <SectionCardHeader
        icon={Calculator}
        title={t("events.killDetail.multipliers.title")}
        actions={
          <>
            {eventConfig.scoringMode === "ADVANCED" ? (
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {t("events.killDetail.multipliers.ruleCount", {
                  count: rules.length,
                })}
              </span>
            ) : null}
          </>
        }
      />

      {eventConfig.scoringMode === "SIMPLE" ? (
        <p className="px-3 py-3 text-sm text-muted-foreground">
          {t("events.killDetail.multipliers.simpleMode")}
        </p>
      ) : (
        <ScoringRulesOverview
          scoringRules={eventConfig.scoringRules}
          highlightedRuleIds={highlightedRuleIds}
          t={t}
        />
      )}
    </SectionCard>
  );
};
