import { Card } from "@lootlog/ui/components/card";
import { Calculator } from "lucide-react";
import type { EventConfig } from "../../hooks/queries/use-kill-detail";
import type { TFunction } from "i18next";

interface MultipliersCardProps {
  eventConfig: EventConfig;
  t: TFunction;
}

export const MultipliersCard = ({ eventConfig, t }: MultipliersCardProps) => {
  return (
    <Card className="p-3 bg-card/40 backdrop-blur-sm border-border gap-2">
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Calculator className="w-4 h-4" />
        {t("events.killDetail.multipliers.title", "Zasady punktacji")}
      </h3>

      <div className="space-y-3 text-sm">
        <div>
          <p className="font-medium mb-1">
            {t("events.killDetail.multipliers.baseSection", "Podstawa")}
          </p>
          <div className="space-y-1 text-muted-foreground">
            {eventConfig.baseThresholds.map((threshold) => (
              <p key={threshold.percentage}>
                {`>= ${threshold.percentage}% = ${threshold.points.toFixed(2)} pkt`}
              </p>
            ))}
            <p>
              {t(
                "events.killDetail.multipliers.leaveGrace",
                "Dla progu 75%: punkt 1.0 tylko jeśli kill był do {{minutes}} min od zejścia",
                { minutes: eventConfig.leaveGraceMinutes },
              )}
            </p>
          </div>
        </div>

        <div>
          <p className="font-medium mb-1">
            {t("events.killDetail.multipliers.bonusesSection", "Bonusy")}
          </p>
          <div className="space-y-1 text-muted-foreground">
            <p>
              {t(
                "events.killDetail.multipliers.groupBonus",
                "Mała grupa ({{min}}-{{max}} osób): +{{points}}",
                {
                  min: eventConfig.groupBonus.minAssignedMembers,
                  max: eventConfig.groupBonus.maxAssignedMembers,
                  points: eventConfig.groupBonus.points.toFixed(2),
                },
              )}
            </p>
            <p>
              {t(
                "events.killDetail.multipliers.nightBonus",
                "Nocna warta {{from}}-{{to}} (>= {{coverage}}% czasu): +{{points}}",
                {
                  from: eventConfig.nightBonus.windowStart,
                  to: eventConfig.nightBonus.windowEnd,
                  coverage: eventConfig.nightBonus.requiredCoveragePercentage,
                  points: eventConfig.nightBonus.points.toFixed(2),
                },
              )}
            </p>
            <p>
              {t(
                "events.killDetail.multipliers.pvpBonus",
                "Kill w godzinach {{from}}-{{to}}: +{{points}}",
                {
                  from: eventConfig.pvpBonus.windowStart,
                  to: eventConfig.pvpBonus.windowEnd,
                  points: eventConfig.pvpBonus.points.toFixed(2),
                },
              )}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-border/50 text-muted-foreground">
          <p>
            {t(
              "events.killDetail.multipliers.cap",
              "Maksymalnie {{points}} pkt za jednego herosa",
              { points: eventConfig.hardCapPoints.toFixed(2) },
            )}
          </p>
          <p>
            {t(
              "events.killDetail.multipliers.timezone",
              "Strefa: {{timezone}}",
              {
                timezone: eventConfig.timezone,
              },
            )}
          </p>
        </div>
      </div>
    </Card>
  );
};
