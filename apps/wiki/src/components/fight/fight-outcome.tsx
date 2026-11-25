import { formatNumber } from "@lootlog/domain/locale";
import { SectionCard } from "@lootlog/ui/components/section-card";
import { t } from "@/i18n/messages";
import type { FighterSummary, FightSummary } from "@/lib/fight/fight-summary";
import { FightKpi } from "./fight-kpi";
import { formatShare, formatTenths } from "./fight-stat-rows";

type FightOutcomeProps = {
  summary: FightSummary;
  notes: readonly string[];
};

const hpOnWin = (fighter: FighterSummary | undefined) =>
  fighter?.averageHpLeftOnWin === null || fighter === undefined
    ? t("fightPage.noWins")
    : formatShare(fighter.averageHpLeftOnWin);

export function FightOutcome({ summary, notes }: FightOutcomeProps) {
  const [mine, theirs] = summary.fighters;
  const won = summary.winRate[0] ?? 0;
  const lost = summary.winRate[1] ?? 0;

  return (
    <SectionCard
      aria-label={t("fightPage.outcomeTitle")}
      className="flex flex-col gap-3 p-3"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-3 tabular-nums">
          <span className="text-3xl leading-none font-semibold text-signal-ready">
            {formatShare(won)}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("fightPage.winRateDetail", {
              margin: formatShare(summary.winRateMargin[0] ?? 0),
              runs: formatNumber(summary.runs),
            })}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {t("fightPage.drawRateDetail", {
              rate: formatShare(summary.drawRate),
            })}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("fightPage.lossRateDetail")}
          </span>
          <span className="text-lg leading-none font-semibold text-signal-alert">
            {formatShare(lost)}
          </span>
        </div>
        <div
          role="img"
          aria-label={t("fightPage.outcomeBarLabel", {
            won: formatShare(won),
            drawn: formatShare(summary.drawRate),
            lost: formatShare(lost),
          })}
          className="flex h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <span
            className="bg-signal-ready"
            style={{ width: `${won * 100}%` }}
          />
          <span
            className="bg-muted-foreground/40"
            style={{ width: `${summary.drawRate * 100}%` }}
          />
          <span
            className="bg-signal-alert"
            style={{ width: `${lost * 100}%` }}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-x-10 gap-y-2 border-t border-border/50 pt-2">
        <dl className="flex flex-wrap gap-x-10 gap-y-2">
          <FightKpi
            label={t("fightPage.fightLength")}
            value={t("fightPage.fightLengthValue", {
              moves: formatTenths(summary.averageMoves),
            })}
            detail={t("fightPage.fightLengthDetail", {
              median: formatNumber(summary.moves.median),
              p10: formatNumber(summary.moves.p10),
              p90: formatNumber(summary.moves.p90),
            })}
          />
          <FightKpi
            label={t("fightPage.hpLeft")}
            value={formatShare(mine?.averageHpLeft ?? 0)}
            detail={t("fightPage.hpLeftDetail", { won: hpOnWin(mine) })}
          />
          <FightKpi
            label={t("fightPage.opponentHpLeft")}
            value={formatShare(theirs?.averageHpLeft ?? 0)}
            detail={t("fightPage.hpLeftDetail", { won: hpOnWin(theirs) })}
          />
        </dl>
        <ul className="ml-auto flex flex-col gap-0.5 text-xs text-muted-foreground">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}
