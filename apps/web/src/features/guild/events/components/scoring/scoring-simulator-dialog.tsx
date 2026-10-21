import { useScoringSimulator } from "./use-scoring-simulator";
import { ScoringSimulatorResults } from "./scoring-simulator-results";
import { ScoringSimulatorRuleToggles } from "./scoring-simulator-rule-toggles";
import { ScoringSimulatorManualInputs } from "./scoring-simulator-manual-inputs";
import { ScoringSimulatorTimelineEditor } from "./scoring-simulator-timeline-editor";
import { ScoringSimulatorTimelineResults } from "./scoring-simulator-timeline-results";
import { useTranslation } from "react-i18next";
import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";
import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import type { EventScoringRules } from "@lootlog/domain/scoring";
import { FlaskConical } from "lucide-react";

interface ScoringSimulatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scoringRules: EventScoringRules;
}

export const ScoringSimulatorDialog = ({
  open,
  onOpenChange,
  scoringRules,
}: ScoringSimulatorDialogProps) => {
  const { t } = useTranslation();
  const simulator = useScoringSimulator(scoringRules);

  const appliedRules =
    simulator.mode === "timeline"
      ? (simulator.timelineResult.results[0]?.explanation.result.appliedRules ??
        [])
      : simulator.result.appliedRules;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <IconDialogHeader
          icon={FlaskConical}
          title={t("events.scoring.simulator.dialogTitle")}
          description={t("events.scoring.simulator.dialogDescription")}
        />

        <ScrollArea className="min-h-0 flex-1">
          <div className="grid gap-5 p-5">
            <AnimatedToggleGroup
              label={t("events.scoring.simulator.modeLabel")}
              value={simulator.mode}
              onValueChange={simulator.setMode}
              options={[
                {
                  value: "timeline",
                  label: t("events.scoring.simulator.mode.timeline"),
                },
                {
                  value: "manual",
                  label: t("events.scoring.simulator.mode.manual"),
                },
              ]}
              className="sm:max-w-96"
            />

            {simulator.mode === "timeline" ? (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
                <ScoringSimulatorTimelineEditor
                  timeline={simulator.timeline}
                  onChange={simulator.setTimeline}
                />
                <section
                  className="grid content-start gap-2"
                  aria-label={t("events.scoring.simulator.results")}
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("events.scoring.simulator.results")}
                  </p>
                  <ScoringSimulatorTimelineResults
                    result={simulator.timelineResult}
                    rules={simulator.rulesWithOverrides}
                  />
                </section>
              </div>
            ) : (
              <div className="grid gap-4">
                <ScoringSimulatorResults
                  result={simulator.result}
                  hardCapPoints={scoringRules.hardCapPoints}
                />
                <ScoringSimulatorManualInputs simulator={simulator} />
              </div>
            )}

            <div className="border-t border-border pt-4">
              <ScoringSimulatorRuleToggles
                rules={scoringRules.rules}
                overrides={simulator.ruleOverrides}
                appliedRules={appliedRules}
                onToggle={simulator.toggleRule}
              />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
