import { Card } from "@lootlog/ui/components/card";
import { Calculator } from "lucide-react";
import type { EventConfig } from "../hooks/queries/use-kill-detail";
import type { TFunction } from "i18next";

interface MultipliersCardProps {
  eventConfig: EventConfig;
  t: TFunction;
}

export const MultipliersCard = ({ eventConfig, t }: MultipliersCardProps) => {
  const hasTimeMultipliers =
    eventConfig.timeOfDayMultipliers &&
    eventConfig.timeOfDayMultipliers.length > 0;
  const hasTrackersMultipliers =
    eventConfig.trackersMultipliers &&
    Object.keys(eventConfig.trackersMultipliers).length > 0;
  const hasMapsMultipliers =
    eventConfig.mapsCountMultipliers &&
    Object.keys(eventConfig.mapsCountMultipliers).length > 0;

  if (!hasTimeMultipliers && !hasTrackersMultipliers && !hasMapsMultipliers) {
    return null;
  }

  return (
    <Card className="p-3 bg-card/40 backdrop-blur-sm border-border gap-2">
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Calculator className="w-4 h-4" />
        {t("events.killDetail.multipliers.title")}
      </h3>

      <div className="space-y-3">
        <div className="text-sm">
          <span className="text-muted-foreground">
            {t("events.killDetail.multipliers.basePoints")}:
          </span>{" "}
          <span className="font-medium">{eventConfig.basePointsPerKill}</span>
        </div>

        {hasTimeMultipliers && (
          <div>
            <h4 className="text-sm font-medium mb-1.5">
              {t("events.killDetail.multipliers.timeOfDay")}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {eventConfig.timeOfDayMultipliers!.map((m, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1.5 rounded bg-muted/30 text-sm"
                >
                  <span className="text-muted-foreground">
                    {m.from} - {m.to}
                  </span>
                  <span className="ml-2 font-medium text-primary">
                    x{m.multiplier}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasTrackersMultipliers && (
          <div>
            <h4 className="text-sm font-medium mb-1.5">
              {t("events.killDetail.multipliers.trackers")}
            </h4>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5">
              {Object.entries(eventConfig.trackersMultipliers!).map(
                ([count, multiplier]) => (
                  <div
                    key={count}
                    className="px-2.5 py-1.5 rounded bg-muted/30 text-sm text-center"
                  >
                    <span className="text-muted-foreground">{count}+</span>
                    <span className="ml-1 font-medium text-primary">
                      x{multiplier}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {hasMapsMultipliers && (
          <div>
            <h4 className="text-sm font-medium mb-1.5">
              {t("events.killDetail.multipliers.maps")}
            </h4>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5">
              {Object.entries(eventConfig.mapsCountMultipliers!).map(
                ([count, multiplier]) => (
                  <div
                    key={count}
                    className="px-2.5 py-1.5 rounded bg-muted/30 text-sm text-center"
                  >
                    <span className="text-muted-foreground">{count}</span>
                    <span className="ml-1 font-medium text-primary">
                      x{multiplier}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
