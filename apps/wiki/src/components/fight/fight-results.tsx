import { Dices } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { StatsTile } from "@lootlog/ui/components/stats-tile";
import { StatsTileGrid } from "@lootlog/ui/components/stats-tile-grid";
import { formatDecimal } from "@lootlog/domain/locale";
import { ArticleSection } from "@/components/article/article-section";
import { t } from "@/i18n/messages";
import { formatPercent } from "@/lib/calculator-format";
import type { FightRun } from "@/lib/fight/fight-run";
import { FightSampleBattle } from "./fight-sample-battle";

type FightResultsProps = {
  run: FightRun;
  stale: boolean;
  ignoredSkills: readonly string[];
  onAnotherSample: () => void;
};

const share = (rate: number) => formatPercent(Math.round(rate * 1000) / 10);

const sampleOutcome = (winner: number | null) => {
  if (winner === null) return t("fightPage.sampleDraw");

  return winner === 0 ? t("fightPage.sampleWon") : t("fightPage.sampleLost");
};

export function FightResults({
  run,
  stale,
  ignoredSkills,
  onAnotherSample,
}: FightResultsProps) {
  const { summary, sample } = run;
  const [mine, theirs] = summary.fighters;

  const notes = [
    ...(stale ? [t("fightPage.stale")] : []),
    ...(ignoredSkills.length > 0
      ? [t("fightPage.ignoredSkills", { skills: ignoredSkills.join(", ") })]
      : []),
    t("fightPage.limits"),
  ];

  return (
    <div className="flex flex-col gap-8">
      <StatsTileGrid framed className="sm:grid-cols-2 xl:grid-cols-4">
        <StatsTile
          label={t("fightPage.winRate")}
          value={share(summary.winRate[0] ?? 0)}
          detail={t("fightPage.winRateDetail", { runs: summary.runs })}
        />
        <StatsTile
          label={t("fightPage.drawRate")}
          value={share(summary.drawRate)}
          detail={t("fightPage.drawRateDetail")}
        />
        <StatsTile
          label={t("fightPage.averageMoves")}
          value={formatDecimal(Math.round(summary.averageMoves * 10) / 10)}
          detail={t("fightPage.averageMovesDetail", {
            mine: formatDecimal(
              Math.round((mine?.averageMoves ?? 0) * 10) / 10,
            ),
            theirs: formatDecimal(
              Math.round((theirs?.averageMoves ?? 0) * 10) / 10,
            ),
          })}
        />
        <StatsTile
          label={t("fightPage.hpLeft")}
          value={share(mine?.averageHpLeft ?? 0)}
          detail={t("fightPage.hpLeftDetail", {
            theirs: share(theirs?.averageHpLeft ?? 0),
          })}
        />
      </StatsTileGrid>
      <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <ArticleSection
        id="fight-sample"
        title={t("fightPage.sampleTitle")}
        description={sampleOutcome(sample.result.winner)}
        action={
          <Button variant="outline" size="sm" onClick={onAnotherSample}>
            <Dices aria-hidden="true" />
            {t("fightPage.anotherSample")}
          </Button>
        }
      >
        <FightSampleBattle sample={sample} />
      </ArticleSection>
    </div>
  );
}
