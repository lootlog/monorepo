import { Square, Swords } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Progress } from "@lootlog/ui/components/progress";
import { TabsList, TabsTrigger } from "@lootlog/ui/components/tabs";
import { t } from "@/i18n/messages";
import { FightRunsSelect } from "./fight-runs-select";

type FightToolbarProps = {
  runs: number;
  onRunsChange: (runs: number) => void;
  progress: number | null;
  canSimulate: boolean;
  onSimulate: () => void;
  onCancel: () => void;
};

export function FightToolbar({
  runs,
  onRunsChange,
  progress,
  canSimulate,
  onSimulate,
  onCancel,
}: FightToolbarProps) {
  const isRunning = progress !== null;

  return (
    <div className="sticky top-14 z-30 -mx-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-background px-4 py-1.5 md:-mx-6 md:px-6">
      <TabsList
        variant="underline"
        aria-label={t("fightPage.sections")}
        className="w-auto border-b-0"
      >
        <TabsTrigger value="analysis">{t("fightPage.analysisTab")}</TabsTrigger>
        <TabsTrigger value="mine">{t("fightPage.myTab")}</TabsTrigger>
        <TabsTrigger value="opponent">{t("fightPage.opponentTab")}</TabsTrigger>
      </TabsList>
      <div className="ml-auto flex items-center gap-2">
        {isRunning ? (
          <Progress
            value={Math.round(progress * 100)}
            aria-label={t("fightPage.progress")}
            className="w-24"
          />
        ) : null}
        <FightRunsSelect
          value={runs}
          onChange={onRunsChange}
          disabled={isRunning}
        />
        {isRunning ? (
          <Button size="sm" variant="outline" onClick={onCancel}>
            <Square aria-hidden="true" />
            {t("fightPage.cancel")}
          </Button>
        ) : (
          <Button size="sm" onClick={onSimulate} disabled={!canSimulate}>
            <Swords aria-hidden="true" />
            {t("fightPage.simulate")}
          </Button>
        )}
      </div>
    </div>
  );
}
