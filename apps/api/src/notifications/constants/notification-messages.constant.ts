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
