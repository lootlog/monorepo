import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { FACTION_WAR_STYLE } from "./faction-war-faction-style";
import type { FactionWarStanding } from "./faction-war-standings";

const percentFormatter = new Intl.NumberFormat("pl-PL", {
  style: "percent",
  maximumFractionDigits: 0,
});

type FactionWarTugBarProps = {
  /** Both factions in side order (`getFactionWarStandings`). */
  standings: readonly FactionWarStanding[];
};

/** Each faction's share of the war score as one rope, pulled from both ends. Sits on the war art. */
export const FactionWarTugBar = ({ standings }: FactionWarTugBarProps) => {
  const { t } = useTranslation();

  const label = standings
    .map((standing) =>
      t("factionWar.hero.share", {
        faction: t(`factionWar.factions.${standing.faction}`),
        share: percentFormatter.format(standing.share),
      }),
    )
    .join(", ");

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="img"
        aria-label={label}
        className="flex h-2.5 overflow-hidden rounded-full bg-white/15 ring-1 ring-white/20"
      >
        {standings.map((standing, index) => (
          <div
            key={standing.faction}
            className={cn(
              "h-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
              FACTION_WAR_STYLE[standing.faction].fill,
              // The last side takes what is left, so rounding never leaves a gap.
              index === standings.length - 1 && "flex-1",
            )}
            style={
              index === standings.length - 1
                ? undefined
                : { width: `${standing.share * 100}%` }
            }
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="flex justify-between text-xs font-semibold tabular-nums"
      >
        {standings.map((standing) => (
          <span
            key={standing.faction}
            className={FACTION_WAR_STYLE[standing.faction].textOnArt}
          >
            {percentFormatter.format(standing.share)}
          </span>
        ))}
      </div>
    </div>
  );
};
