import type {
  FactionWar,
  FactionWarFaction,
} from "@lootlog/domain/faction-war";
import { formatDiscordTimestamp } from "#src/notifications/content/discord-timestamp";

const FACTION_LABEL: Record<FactionWarFaction, string> = {
  BARBATOS: "🔥 **Barbatos**",
  TANROTH: "❄️ **Tanroth**",
};

const FACTION_NAME: Record<FactionWarFaction, string> = {
  BARBATOS: "Barbatos",
  TANROTH: "Tanroth",
};

const points = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

const multiplier = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 2,
});

const warName = (war: FactionWar) =>
  war.factions.map((faction) => FACTION_NAME[faction]).join(" kontra ");

/** `YYYY-MM-DD` as the Polish `DD.MM.YYYY`. */
const polishDay = (day: string) => day.split("-").toReversed().join(".");

const daysLabel = (days: number) => (days === 1 ? "1 dzień" : `${days} dni`);

const scoreLines = (
  war: FactionWar,
  score: Readonly<Record<FactionWarFaction, number>>,
) =>
  war.factions.map(
    (faction) =>
      `${FACTION_LABEL[faction]}: **${points.format(score[faction])}** pkt`,
  );

const pageLine = (pageUrl: string) => `Ranking i szczegóły: ${pageUrl}`;

export type FactionWarAnnouncementContent = {
  readonly title: string;
  readonly content: string;
};

export const factionWarStartedContent = (
  war: FactionWar,
  pageUrl: string,
): FactionWarAnnouncementContent => {
  const endsAt = new Date(war.endsAt);

  return {
    title: "Wojna frakcji wystartowała",
    content: [
      `## ⚔️ Wojna frakcji ${warName(war)} wystartowała!`,
      `${war.factions.map((faction) => FACTION_LABEL[faction]).join(" kontra ")} od ${formatDiscordTimestamp(new Date(war.startsAt), "f")} do ${formatDiscordTimestamp(endsAt, "f")} (koniec ${formatDiscordTimestamp(endsAt, "R")}).`,
      "",
      "**Zasady**",
      "- Frakcję wybierasz raz, w dodatku Lootlog w grze.",
      "- Punkty zdobywasz za zabite elity, elity II, herosów, kolosów i tytanów, za unikatowe, heroiczne i legendarne łupy, za czas online i za wygrane walki PvP.",
      "- Każde źródło punktów ma dzienny limit.",
      `- Frakcja z mniejszą liczbą aktywnych graczy dostaje każdego dnia bonus do wyniku, maksymalnie ×${multiplier.format(war.scoring.underdogBonusCap)}.`,
      "- Zwycięzcy noszą w grze wyróżnienie swojej frakcji aż do końca następnej wojny.",
      "",
      pageLine(pageUrl),
    ].join("\n"),
  };
};

export type FactionWarDailySummary = {
  readonly day: string;
  /** Faction score after each day's bonus, through `day`. */
  readonly score: Readonly<Record<FactionWarFaction, number>>;
  /** Score `day` itself added after its bonus. */
  readonly dayScore: Readonly<Record<FactionWarFaction, number>>;
  readonly activePlayers: Readonly<Record<FactionWarFaction, number>>;
  readonly multipliers: Readonly<Record<FactionWarFaction, number>>;
  /** Warsaw days still to play, today included; 0 after the last one. */
  readonly daysLeft: number;
};

export const factionWarDailyContent = (
  war: FactionWar,
  summary: FactionWarDailySummary,
  pageUrl: string,
): FactionWarAnnouncementContent => {
  const underdog = war.factions.find(
    (faction) => summary.multipliers[faction] > 1,
  );

  return {
    title: "Wojna frakcji: podsumowanie dnia",
    content: [
      `## ⚔️ Wojna frakcji: podsumowanie dnia ${polishDay(summary.day)}`,
      ...war.factions.map(
        (faction) =>
          `${FACTION_LABEL[faction]}: **${points.format(summary.score[faction])}** pkt (+${points.format(summary.dayScore[faction])} tego dnia)`,
      ),
      "",
      `Aktywni gracze tego dnia: ${war.factions
        .map(
          (faction) =>
            `${FACTION_NAME[faction]} **${points.format(summary.activePlayers[faction])}**`,
        )
        .join(", ")}`,
      underdog
        ? `Bonus mniejszej frakcji: **${FACTION_NAME[underdog]} ×${multiplier.format(summary.multipliers[underdog])}**`
        : "Bonus mniejszej frakcji: brak.",
      summary.daysLeft > 0
        ? `Do końca wojny: **${daysLabel(summary.daysLeft)}**`
        : "To był ostatni dzień wojny.",
      "",
      pageLine(pageUrl),
    ].join("\n"),
  };
};

export const factionWarEndedContent = (
  war: FactionWar,
  result: {
    readonly score: Readonly<Record<FactionWarFaction, number>>;
    readonly winners: readonly FactionWarFaction[];
  },
  pageUrl: string,
): FactionWarAnnouncementContent => {
  const [winner] = result.winners;

  const verdict =
    result.winners.length > 1
      ? `Remis! Zwyciężają obie frakcje: ${result.winners.map((faction) => FACTION_LABEL[faction]).join(" i ")}.`
      : winner
        ? `Zwycięża ${FACTION_LABEL[winner]}!`
        : "Żadna frakcja nie zdobyła punktów, więc tym razem nie ma zwycięzcy.";

  return {
    title: "Wojna frakcji zakończona",
    content: [
      `## 🏆 Wojna frakcji ${warName(war)} zakończona!`,
      verdict,
      "",
      "**Wynik końcowy z bonusem**",
      ...scoreLines(war, result.score),
      ...(winner
        ? [
            "",
            "Zwycięzcy noszą w grze wyróżnienie swojej frakcji aż do końca następnej wojny.",
          ]
        : []),
      "",
      pageLine(pageUrl),
    ].join("\n"),
  };
};
