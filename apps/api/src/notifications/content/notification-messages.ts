export const DEFAULT_TIMER_NOTIFICATION_TEMPLATE = [
  "## {{npcName}}",
  "",
  "Swiat: **{{world}}**",
  "Okno spawnu: **{{minSpawnTime}} - {{maxSpawnTime}}**",
  "Zaplanowana wysylka: **{{scheduledFor}}**",
].join("\n");

export const DEFAULT_SCHEDULED_MESSAGE_TEMPLATE = [
  "## {{ruleName}}",
  "",
  "Zaplanowana wysylka: **{{scheduledFor}}**",
].join("\n");

export const DEFAULT_HERO_SIGHTING_TEMPLATE = [
  "## {{heroName}} ({{heroLevel}})",
  "",
  "{{state}}: **{{mapName}}**",
  "Świat: **{{world}}**",
  "Wykrył: **{{detectedBy}}**",
].join("\n");

export const heroSightingAddedByHand = (memberName: string) =>
  `${memberName} (ręcznie)`;

export const HERO_SIGHTED_TITLE = "Wykryto herosa";

export const HERO_SIGHTING_STATE_LABEL = "Pojawi się w";

export const heroSightingMessage = (
  heroName: string,
  state: string,
  mapName: string,
  world: string,
) => `${heroName} — ${state.toLowerCase()}: ${mapName} (świat ${world}).`;

export const DEFAULT_LOOT_DRAW_TEMPLATE = [
  "## Koło: {{itemName}}",
  "",
  "{{outcome}}",
  "Zakręcił: **{{drawnBy}}** · Świat: **{{world}}**",
].join("\n");

export const LOOT_DRAW_RESOLVED_TITLE = "Wynik koła";

export const BINGO_MILESTONE_TITLE = "Clan Bingo";

export const DEFAULT_BINGO_MILESTONE_TEMPLATE = [
  "## {{boardName}} — {{milestoneLabel}}",
  "",
  "**{{memberName}}** zalicza pole **{{tileTitle}}**",
  "{{summary}}",
  "Postęp: **{{completedTileCount}}/25** pól · **{{completedLinesCount}}** linii · **{{totalPoints}}** pkt",
].join("\n");

export const bingoMilestoneLabel = (
  kind: "TILE_COMPLETED" | "LINE_COMPLETED" | "BLACKOUT",
) => {
  if (kind === "BLACKOUT") return "PEŁNA PLANSZA (BLACKOUT)!";

  if (kind === "LINE_COMPLETED") return "NOWA LINIA BINGO!";

  return "Zaliczone pole";
};

export const bingoMilestoneMessage = (
  memberName: string,
  tileTitle: string,
  boardName: string,
  kind: "TILE_COMPLETED" | "LINE_COMPLETED" | "BLACKOUT",
) => {
  if (kind === "BLACKOUT") {
    return `${memberName} ukończył(a) całą planszę Bingo "${boardName}" (ostatnie pole: ${tileTitle})!`;
  }

  if (kind === "LINE_COMPLETED") {
    return `${memberName} zdobył(a) linię Bingo w "${boardName}" dzięki polu "${tileTitle}"!`;
  }

  return `${memberName} zaliczył(a) pole "${tileTitle}" w Bingo "${boardName}".`;
};

export const lootDrawOutcomeLine = (
  winnerName: string,
  tickets: string,
  voided: { readonly by: string; readonly reason: string } | null,
) =>
  voided
    ? `Wynik unieważniony przez **${voided.by}** (wygrał ${winnerName}). Powód: ${voided.reason}`
    : `Wygrywa **${winnerName}** (${tickets}).`;

export const lootDrawMessage = (
  itemName: string,
  winnerName: string,
  voided: boolean,
) =>
  voided
    ? `Unieważniono wynik losowania ${itemName} (wygrał ${winnerName}).`
    : `${itemName}: wygrywa ${winnerName}.`;

export const TIMER_NOTIFICATION_TITLE = "Nadchodzacy spawn";

export const SCHEDULED_MESSAGE_TITLE = "Zaplanowana wiadomosc";

export const GENERIC_NOTIFICATION_TITLE = "Powiadomienie";

export const SPAWN_NOTIFICATION_FALLBACK_NAME = "Powiadomienie o spawnie";

export const TIMER_BEFORE_SPAWN_LABEL = "Przypomnienie przed spawnem";

export const SCHEDULED_MESSAGE_DEFAULT_NAME = "Zaplanowana wiadomosc";

export const FALLBACK_NPC_NAME = "Wybrany NPC";

export const FALLBACK_WORLD_NAME = "Wybrany swiat";

export const WATCHED_ITEM_DROPPED_TITLE = "Obserwowany item wypadł!";

export const timerMaxSpawnReached = (npcLabel: string, world: string) =>
  `${npcLabel} osiąga maksymalny czas spawnu na świecie ${world}.`;

export const timerMaxSpawnIn = (
  npcLabel: string,
  world: string,
  minutes: number,
) =>
  `${npcLabel} osiągnie maksymalny czas spawnu na świecie ${world} za ${minutes} min.`;

export const timerMinSpawnReached = (npcLabel: string, world: string) =>
  `${npcLabel} osiąga minimalny czas spawnu na świecie ${world}.`;

export const timerMinSpawnIn = (
  npcLabel: string,
  world: string,
  minutes: number,
) =>
  `${npcLabel} osiągnie minimalny czas spawnu na świecie ${world} za ${minutes} min.`;

export const scheduledMessageNotification = (ruleName: string) =>
  `Zaplanowana wiadomosc "${ruleName}".`;

export const ruleTestWithWorld = (ruleLabel: string, world: string) =>
  `To jest test reguły "${ruleLabel}" dla świata ${world}.`;

export const ruleTestWithoutWorld = (ruleLabel: string) =>
  `To jest test reguły "${ruleLabel}".`;

export const watchedItemDroppedMessage = (
  world: string,
  guildNames: string,
  watchedItemName: string,
) =>
  `Na świecie ${world} na lootlogu ${guildNames} wypadł obserwowany przedmiot: ${watchedItemName}`;
