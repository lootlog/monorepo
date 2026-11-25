import { SectionCard } from "@lootlog/ui/components/section-card";
import { SectionCardContent } from "@lootlog/ui/components/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { t } from "@/i18n/messages";
import { winnerHpBuckets } from "@/lib/fight/fight-highlights";
import type { FightSummary } from "@/lib/fight/fight-summary";
import { FightHpCurve } from "./fight-hp-curve";
import { FightLengthChart } from "./fight-length-chart";
import { FightPairBars } from "./fight-pair-bars";
import { FightSidesLegend } from "./fight-sides-legend";
import { fightStatRows, type FightStatSectionId } from "./fight-stat-rows";
import { FightWinnerHpChart } from "./fight-winner-hp-chart";

type FightResultsProps = {
  summary: FightSummary;
  selectedLengths: { from: number; to: number } | null;
  onSelectLengths: (lengths: { from: number; to: number }) => void;
};

const STAT_SECTIONS: readonly FightStatSectionId[] = [
  "damage",
  "strikes",
  "skills",
  "turns",
  "outcome",
];

const CHART_CONTENT_CLASS = "h-56";

export function FightResults({
  summary,
  selectedLengths,
  onSelectLengths,
}: FightResultsProps) {
  const [mine, theirs] = summary.fighters;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(19rem,1fr))] gap-3">
      <SectionCard
        aria-labelledby="fight-hp-curve"
        className="col-span-full min-[94rem]:col-span-2"
      >
        <SectionCardHeader
          id="fight-hp-curve"
          title={t("fightPage.hpCurveTitle")}
          description={t("fightPage.hpCurveDescription")}
          actions={<FightSidesLegend />}
        />
        <SectionCardContent className={CHART_CONTENT_CLASS}>
          <FightHpCurve moves={summary.hpAfterMove} />
        </SectionCardContent>
      </SectionCard>
      <SectionCard aria-labelledby="fight-lengths">
        <SectionCardHeader
          id="fight-lengths"
          title={t("fightPage.lengthTitle")}
          description={t("fightPage.lengthDescription")}
        />
        <SectionCardContent>
          <FightLengthChart
            summary={summary}
            selected={selectedLengths}
            onSelect={onSelectLengths}
          />
        </SectionCardContent>
      </SectionCard>
      <SectionCard aria-labelledby="fight-winner-hp">
        <SectionCardHeader
          id="fight-winner-hp"
          title={t("fightPage.winnerHpTitle")}
          description={t("fightPage.winnerHpDescription")}
        />
        <SectionCardContent className={CHART_CONTENT_CLASS}>
          <FightWinnerHpChart
            buckets={winnerHpBuckets(summary.fights, summary.winRate.length)}
          />
        </SectionCardContent>
      </SectionCard>
      {mine && theirs
        ? STAT_SECTIONS.flatMap((section) => {
            const rows = fightStatRows(section, mine, theirs);
            const headingId = `fight-stats-${section}`;

            return rows.length === 0
              ? []
              : [
                  <SectionCard key={section} aria-labelledby={headingId}>
                    <SectionCardHeader
                      id={headingId}
                      title={t(`fightPage.statSections.${section}`)}
                      description={t(`fightPage.statDescriptions.${section}`)}
                    />
                    <SectionCardContent>
                      <FightPairBars rows={rows} />
                    </SectionCardContent>
                  </SectionCard>,
                ];
          })
        : null}
    </div>
  );
}
