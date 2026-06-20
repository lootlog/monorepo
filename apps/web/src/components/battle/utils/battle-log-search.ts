import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";

export type BattleLogSearchEntry = {
  turn: number;
  rawText: string;
  visibleText?: string;
};

export type BattleLogSearchMatch = {
  turn: number;
};

export type BattleLogSearchDirection = "previous" | "next";

const DIACRITICS_REGEX = /\p{Diacritic}/gu;
const POLISH_CHARACTER_REPLACEMENTS: Record<string, string> = {
  Ł: "L",
  ł: "l",
};

const ACTION_SEARCH_LABELS: Record<string, readonly string[]> = {
  "+crit": ["Cios krytyczny"],
  "+critwound": ["Rana krytyczna"],
  "+legbon_anguish": ["Krwawa udręka"],
  "+legbon_curse": ["Klątwa"],
  "+legbon_frenzy_main": ["Eskalacja szału", "Szał"],
  "+legbon_frenzy_off": ["Eskalacja szału", "Szał"],
  "+legbon_holytouch": ["Dotyk anioła"],
  "+legbon_puncture": ["Przeszywająca skuteczność"],
  "+legbon_verycrit": ["Cios bardzo krytyczny"],
  "+of_crit": ["Cios krytyczny broni pomocniczej"],
  "+of_wound": ["Głęboka rana broni pomocniczej"],
  "+of_woundpoison": ["Głęboka rana pomocnicza", "Głęboka rana z trucizną"],
  "+wound": ["Głęboka rana"],
  "+woundpoison": ["Głęboka rana z trucizną"],
  "-arrowblock": ["Blok strzały"],
  "-blok": ["Blok"],
  "-block": ["Blok"],
  "-contra": ["Kontratak"],
  "-evade": ["Unik"],
  "-legbon_cleanse": ["Płomienne oczyszczenie", "Oczyszczenie"],
  "-legbon_critred": ["Krytyczna osłona"],
  "-legbon_facade": ["Fasada opieki"],
  "-legbon_glare": ["Oślepienie"],
  "-legbon_retaliation": ["Aura odwetu", "Odwet"],
  "-parry": ["Parowanie"],
  "-pierceb": ["Blok przebicia"],
  anguish: ["Krwawa udręka", "Udręka"],
  critwound: ["Rana krytyczna"],
  fire: ["Ogień"],
  heal: ["Leczenie", "Przywrócono punkty życia"],
  injure: ["Rana"],
  legbon_holytouch_heal: ["Dotyk anioła"],
  legbon_lastheal: ["Ostatni ratunek"],
  light: ["Błyskawica"],
  poison: ["Trucizna"],
  wound: ["Głęboka rana"],
};

const appendSearchPart = (parts: string[], value: unknown): void => {
  if (value === null || value === undefined) {
    return;
  }

  const text = String(value).trim();

  if (text.length === 0) {
    return;
  }

  parts.push(text);
};

const appendWarriorSearchParts = (
  parts: string[],
  warrior: Warrior | undefined,
): void => {
  if (!warrior) {
    return;
  }

  appendSearchPart(parts, warrior.originalId);
  appendSearchPart(parts, warrior.name);
  appendSearchPart(parts, warrior.lvl);
  appendSearchPart(parts, warrior.prof);
  appendSearchPart(parts, warrior.team);
};

const appendActionSearchParts = (
  parts: string[],
  action: RawBattleParsedEvent["actions"][number],
): void => {
  appendSearchPart(parts, action.actionType);
  appendSearchPart(parts, action.param);

  ACTION_SEARCH_LABELS[action.actionType]?.forEach((label) => {
    appendSearchPart(parts, label);
  });
};

export const normalizeBattleLogSearchText = (value: string): string =>
  value
    .replace(
      /[Łł]/g,
      (character) => POLISH_CHARACTER_REPLACEMENTS[character] ?? character,
    )
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLocaleLowerCase("pl-PL")
    .replace(/\s+/g, " ")
    .trim();

export const buildBattleLogRawSearchText = ({
  event,
  attacker,
  defender,
  turn,
}: {
  event: RawBattleParsedEvent;
  attacker?: Warrior;
  defender?: Warrior;
  turn: number;
}): string => {
  const parts: string[] = [];

  appendSearchPart(parts, turn);
  appendSearchPart(parts, event.attackerId);
  appendSearchPart(parts, event.defenderId);
  appendSearchPart(parts, event.attackerHpPercentage);
  appendSearchPart(parts, event.defenderHpPercentage);
  appendWarriorSearchParts(parts, attacker);
  appendWarriorSearchParts(parts, defender);

  event.actions.forEach((action) => {
    appendActionSearchParts(parts, action);
  });

  return parts.join(" ");
};

export const findBattleLogSearchMatches = ({
  query,
  entries,
}: {
  query: string;
  entries: BattleLogSearchEntry[];
}): BattleLogSearchMatch[] => {
  const normalizedQuery = normalizeBattleLogSearchText(query);

  if (normalizedQuery.length === 0) {
    return [];
  }

  const matchedTurns = new Set<number>();

  entries.forEach((entry) => {
    if (matchedTurns.has(entry.turn)) {
      return;
    }

    const normalizedRawText = normalizeBattleLogSearchText(entry.rawText);
    const normalizedVisibleText = normalizeBattleLogSearchText(
      entry.visibleText ?? "",
    );

    if (
      normalizedRawText.includes(normalizedQuery) ||
      normalizedVisibleText.includes(normalizedQuery)
    ) {
      matchedTurns.add(entry.turn);
    }
  });

  return Array.from(matchedTurns).map((turn) => ({ turn }));
};

export const getNextBattleLogSearchIndex = ({
  currentIndex,
  total,
  direction,
}: {
  currentIndex: number;
  total: number;
  direction: BattleLogSearchDirection;
}): number => {
  if (total <= 0) {
    return -1;
  }

  if (direction === "previous") {
    if (currentIndex <= 0 || currentIndex >= total) {
      return total - 1;
    }

    return currentIndex - 1;
  }

  if (currentIndex < 0 || currentIndex >= total - 1) {
    return 0;
  }

  return currentIndex + 1;
};
