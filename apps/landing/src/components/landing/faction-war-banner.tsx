import { ArrowUpRight, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { links } from "@/src/config/links";
import {
  fetchPublicFactionWar,
  getPublicFactionWarEmblem,
  getPublicFactionWarSides,
  type PublicFactionWar,
} from "@/src/lib/faction-war";

const numberFormatter = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 0,
});

const multiplierFormatter = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("pl-PL", {
  style: "percent",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Warsaw",
});

const SIDE_STYLE = {
  BARBATOS: { fill: "bg-[#e0592a]", text: "text-[#ffb98a]" },
  TANROTH: { fill: "bg-[#3ba7e0]", text: "text-[#a9dcff]" },
} as const;

/**
 * The current faction war's public score, shown once the page is in the
 * browser; nothing renders while the war is unknown or unavailable.
 */
export function FactionWarBanner() {
  const { t } = useTranslation();
  const [war, setWar] = useState<PublicFactionWar | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchPublicFactionWar(controller.signal)
      .then(setWar)
      .catch(() => setWar(null));

    return () => controller.abort();
  }, []);

  if (!war) return null;

  const sides = getPublicFactionWarSides(war);

  const factionName = (faction: string) =>
    t(`landing.factionWar.factions.${faction}`);

  const status =
    war.status === "ENDED"
      ? war.winners.length === 0
        ? t("landing.factionWar.status.noWinner")
        : war.winners.length > 1
          ? t("landing.factionWar.status.tie")
          : t("landing.factionWar.status.winner", {
              faction: factionName(war.winners[0] ?? ""),
            })
      : t(`landing.factionWar.status.${war.status}`, {
          date: dateFormatter.format(
            new Date(war.status === "RUNNING" ? war.endsAt : war.startsAt),
          ),
        });

  return (
    <section
      aria-labelledby="faction-war-title"
      className="border-y border-[var(--broadcast-line)] bg-[var(--broadcast-ink-soft)] py-10 sm:py-12"
    >
      <div className="landing-container flex flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <p className="text-sm font-semibold tracking-wide text-[var(--broadcast-text-muted)] uppercase">
            {t("landing.factionWar.eyebrow")}
          </p>
          <h2
            id="faction-war-title"
            className="text-2xl font-bold text-balance text-[var(--broadcast-white)] sm:text-3xl"
          >
            {t("landing.factionWar.title", {
              left: factionName(sides[0]?.faction ?? ""),
              right: factionName(sides[1]?.faction ?? ""),
            })}
          </h2>
          <p className="text-base text-[var(--broadcast-text-muted)]">
            {status}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {sides.map((side, index) => {
            const emblem = getPublicFactionWarEmblem(war.id, side.faction);
            const opponent = sides[1 - index];

            return (
              <div
                key={side.faction}
                className={
                  index === 0
                    ? "flex flex-col items-start gap-1 text-left"
                    : "flex flex-col items-end gap-1 text-right"
                }
              >
                <div
                  className={`flex items-center gap-2 ${index === 0 ? "" : "flex-row-reverse"}`}
                >
                  {emblem && (
                    <img
                      src={emblem}
                      alt=""
                      width={256}
                      height={256}
                      loading="lazy"
                      decoding="async"
                      className="size-10 sm:size-14"
                    />
                  )}
                  <span
                    className={`flex items-center gap-1.5 text-base font-semibold sm:text-lg ${SIDE_STYLE[side.faction].text}`}
                  >
                    {war.status === "ENDED" &&
                      war.winners.includes(side.faction) && (
                        <Crown
                          className="size-4"
                          aria-label={t("landing.factionWar.winner")}
                        />
                      )}
                    {factionName(side.faction)}
                  </span>
                </div>
                <p className="text-3xl font-bold text-[var(--broadcast-white)] tabular-nums sm:text-5xl">
                  {numberFormatter.format(side.points)}
                  <span className="sr-only">
                    {" "}
                    {t("landing.factionWar.pointsUnit")}
                  </span>
                </p>
                <p className="text-sm text-[var(--broadcast-text-muted)]">
                  {t("landing.factionWar.players", { count: side.players })}
                </p>
                {side.multiplier > 1 && opponent && (
                  <p className="text-sm font-medium text-[var(--broadcast-white)]">
                    {t("landing.factionWar.bonus", {
                      multiplier: `×${multiplierFormatter.format(side.multiplier)}`,
                      opponent: t(
                        `landing.factionWar.factionsGenitive.${opponent.faction}`,
                      ),
                    })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-1.5">
          <div
            role="img"
            aria-label={sides
              .map((side) =>
                t("landing.factionWar.share", {
                  faction: factionName(side.faction),
                  share: percentFormatter.format(side.share),
                }),
              )
              .join(", ")}
            className="flex h-3 overflow-hidden rounded-full bg-[var(--broadcast-line)]"
          >
            {sides.map((side, index) => (
              <div
                key={side.faction}
                className={`h-full ${SIDE_STYLE[side.faction].fill} ${index === sides.length - 1 ? "flex-1" : ""}`}
                style={
                  index === sides.length - 1
                    ? undefined
                    : { width: `${side.share * 100}%` }
                }
              />
            ))}
          </div>
          <div
            aria-hidden="true"
            className="flex justify-between text-sm font-semibold tabular-nums"
          >
            {sides.map((side) => (
              <span
                key={side.faction}
                className={SIDE_STYLE[side.faction].text}
              >
                {percentFormatter.format(side.share)}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href={links.factionWar}
            className="landing-action landing-action-solid"
          >
            {t("landing.factionWar.open")}
          </a>
          <a
            href={links.factionWarGuide}
            className="landing-action landing-action-outline text-[var(--broadcast-white)]"
          >
            {t("landing.factionWar.guide")}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
