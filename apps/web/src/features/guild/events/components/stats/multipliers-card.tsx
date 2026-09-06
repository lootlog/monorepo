import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import type { TFunction } from "i18next";
import { Calculator } from "lucide-react";
import type { EventConfig } from "../../hooks/queries/use-kill-detail";
import { ScoringConfigurationStrip } from "./scoring-configuration-strip";
import { ScoringRulesList } from "./scoring-rules-list";

interface MultipliersCardProps {
  eventConfig: EventConfig;
  highlightedRuleIds?: string[];
  t: TFunction;
}

export const MultipliersCard = ({
  eventConfig,
  highlightedRuleIds = [],
  t,
}: MultipliersCardProps) => {
  const rules = eventConfig.scoringRules?.rules ?? [];
  const hardCapPoints = eventConfig.scoringRules?.hardCapPoints ?? 2;
  const minTrackingPercentForBonuses =
    eventConfig.scoringRules?.minTrackingPercentForBonuses ?? 50;
  const timezone = eventConfig.scoringRules?.timezone ?? "Europe/Warsaw";

  return (
    <SectionCard className="overflow-hidden bg-card">
      <SectionCardHeader
        icon={Calculator}
        title={<> {t("events.killDetail.multipliers.title")} </>}
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
        <>
          <ScoringConfigurationStrip
            hardCapPoints={hardCapPoints}
            minTrackingPercentForBonuses={minTrackingPercentForBonuses}
            timezone={timezone}
            t={t}
          />

          {rules.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              {t("events.killDetail.multipliers.noRules")}
            </p>
          ) : (
            <ScoringRulesList
              highlightedRuleIds={highlightedRuleIds}
              rules={rules}
              t={t}
            />
          )}
        </>
      )}
    </SectionCard>
  );
};
