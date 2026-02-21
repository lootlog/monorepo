import type { TFunction } from "i18next";
import type { EventScoringRules } from "../../types/scoring-rules";

interface EventScoringRulesSummaryProps {
  rules: EventScoringRules;
  t: TFunction;
}

export const EventScoringRulesSummary = ({
  rules,
  t,
}: EventScoringRulesSummaryProps) => {
  const sortedThresholds = [...rules.baseThresholds].sort(
    (a, b) => b.percentage - a.percentage,
  );

  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-medium mb-1">
          {t("events.scoring.summary.baseTitle", "Podstawa")}
        </p>
        <div className="space-y-1 text-muted-foreground">
          {sortedThresholds.map((threshold, index) => (
            <p key={`${threshold.percentage}-${threshold.points}-${index}`}>
              {t(
                "events.scoring.summary.baseRule",
                ">= {{percentage}}% czasu = {{points}} pkt",
                {
                  percentage: threshold.percentage,
                  points: threshold.points,
                },
              )}
            </p>
          ))}
          <p>
            {t(
              "events.scoring.summary.leaveGrace",
              "Jeśli gracz z progu top opuścił mapę, kill musi nastąpić do {{minutes}} min.",
              {
                minutes: rules.leaveGraceMinutes,
              },
            )}
          </p>
        </div>
      </div>

      <div>
        <p className="font-medium mb-1">
          {t("events.scoring.summary.bonusTitle", "Bonusy")}
        </p>
        <div className="space-y-1 text-muted-foreground">
          <p>
            {t(
              "events.scoring.summary.groupBonus",
              "Mała grupa ({{min}}-{{max}}): +{{points}}",
              {
                min: rules.groupBonus.minAssignedMembers,
                max: rules.groupBonus.maxAssignedMembers,
                points: rules.groupBonus.points,
              },
            )}
          </p>
          <p>
            {t(
              "events.scoring.summary.nightBonus",
              "Nocna warta {{from}}-{{to}}, wymagane {{coverage}}%: +{{points}}",
              {
                from: rules.nightBonus.windowStart,
                to: rules.nightBonus.windowEnd,
                coverage: rules.nightBonus.requiredCoveragePercentage,
                points: rules.nightBonus.points,
              },
            )}
          </p>
          <p>
            {t(
              "events.scoring.summary.pvpBonus",
              "Kill {{from}}-{{to}}: +{{points}}",
              {
                from: rules.pvpBonus.windowStart,
                to: rules.pvpBonus.windowEnd,
                points: rules.pvpBonus.points,
              },
            )}
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-border/50 text-muted-foreground">
        <p>
          {t(
            "events.scoring.summary.cap",
            "Maksymalnie {{points}} pkt za kill",
            {
              points: rules.hardCapPoints,
            },
          )}
        </p>
        <p>
          {t("events.scoring.summary.timezone", "Strefa: {{timezone}}", {
            timezone: rules.timezone,
          })}
        </p>
      </div>
    </div>
  );
};
