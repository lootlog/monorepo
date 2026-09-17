import { createTranslationLookup } from "@lootlog/ui/i18n/translation-lookup";

const messages = {
  meta: {
    title: "Lootlog Wiki",
    description:
      "Wiki Lootloga do wyszukiwania przedmiotów, NPC-ów i graczy z Margonem.",
    homeTitle: "Lootlog Wiki",
    itemsTitle: "Przedmioty",
    npcsTitle: "NPC i potwory",
    playersTitle: "Gracze",
  },
  navigation: {
    home: "Start",
    items: "Przedmioty",
    npcs: "NPC",
    players: "Gracze",
  },
  footer: {
    copyright: "Lootlog",
    builtWith: "Przedmioty, NPC i gracze z Margonem",
  },
  home: {
    eyebrow: "Wiki i wyszukiwarka",
    title: "Znajdź przedmioty, NPC i graczy z Margonem.",
    description:
      "Wyszukuj po nazwie i zawężaj wyniki filtrami. Udostępniaj linki do wyników innym graczom.",
    itemsTitle: "Przedmioty",
    itemsDescription:
      "Szukaj przedmiotów po nazwie, poziomie, rzadkości i profesji.",
    npcsTitle: "NPC i potwory",
    npcsDescription: "Szukaj NPC-ów i potworów po nazwie i świecie.",
    playersTitle: "Gracze",
    playersDescription: "Szukaj postaci po nazwie i świecie.",
    statusEyebrow: "Udostępnianie wyników",
    statusTitle: "Podziel się tym, co znajdziesz.",
    statusDescription:
      "Po wyszukaniu skopiuj adres strony i wyślij go innym graczom. Link zachowuje parametry wyszukiwania.",
    ctaItems: "Otwórz wyszukiwarkę przedmiotów",
    ctaNpcs: "Otwórz wyszukiwarkę NPC",
    ctaPlayers: "Otwórz wyszukiwarkę graczy",
  },
  search: {
    queryLabel: "Fraza",
    worldLabel: "Świat",
    filterLabel: "Filtr",
    queryPlaceholder: "np. dria, serce, łowca",
    worldPlaceholder: "np. Gordion",
    filterPlaceholder: 'np. numericStats.lvl >= 50 AND rarity = "UNIQUE"',
    submit: "Szukaj",
    reset: "Wyczyść",
    loading: "Ładowanie wyników...",
    idle: "Wpisz frazę i uruchom wyszukiwanie.",
    error: "Nie udało się pobrać wyników. Spróbuj ponownie.",
    noResults: "Brak wyników dla podanych parametrów.",
    results: "Wyniki: {{count}}",
    limitBadge: "Limit: {{count}}",
    showingRange: "Pokazuję {{start}}-{{end}}",
    iconAlt: "Ikona {{name}}",
    missingValue: "brak",
    apiHint:
      "Skopiuj adres strony, aby udostępnić parametry wyszukiwania innym graczom.",
  },
  common: {
    levelShort: "{{level}} lvl",
  },
  filters: {
    minLevel: "Poziom od",
    maxLevel: "Poziom do",
    minLevelPlaceholder: "1",
    maxLevelPlaceholder: "300",
    sort: "Sortowanie",
    sortOptions: {
      relevance: "Trafność",
      "lvl:asc": "Poziom rosnąco",
      "lvl:desc": "Poziom malejąco",
      "name:asc": "Nazwa A-Z",
      "name:desc": "Nazwa Z-A",
      "rarity:asc": "Rzadkość",
      "type:asc": "Typ",
    },
    rarity: "Rzadkość",
    itemType: "Typ przedmiotu",
    profession: "Profesja",
    professions: {
      w: "Wojownik",
      p: "Paladyn",
      h: "Łowca",
      m: "Mag",
      b: "Tancerz ostrzy",
      t: "Tropiciel",
    },
    advancedFilter: "Filtr zaawansowany",
    advancedFilterPlaceholder: 'np. stat = "sa=120" albo lvl >= 50',
  },
  itemRarity: {
    COMMON: "Zwykły",
    UNIQUE: "Unikat",
    HEROIC: "Heroik",
    UPGRADED: "Ulepszony",
    LEGENDARY: "Legendarny",
  },
  itemType: {
    prefix: "Typ: ",
    ONE_HAND_WEAPON: "Broń jednoręczna",
    TWO_HAND_WEAPON: "Broń dwuręczna",
    ONE_AND_HALF_HAND_WEAPON: "Broń półtoraręczna",
    DISTANCE_WEAPON: "Broń dystansowa",
    HELP_WEAPON: "Pomocnicza",
    WAND_WEAPON: "Różdżka",
    ORB_WEAPON: "Orb",
    ARMOR: "Zbroja",
    HELMET: "Hełm",
    BOOTS: "Buty",
    GLOVES: "Rękawice",
    RING: "Pierścień",
    NECKLACE: "Naszyjnik",
    SHIELD: "Tarcza",
    NEUTRAL: "Neutralne",
    CONSUME: "Konsumpcyjne",
    OUTFITS: "Stroje",
    PETS: "Zwierzaki",
    TELEPORTS: "Teleporty",
    GOLD: "Złoto",
    KEYS: "Klucze",
    QUEST: "Questowe",
    RENEWABLE: "Odnawialne",
    BOOK: "Książka",
    BAG: "Torba",
    BLESS: "Błogosławieństwo",
    UPGRADE: "Ulepszenie",
    RECIPE: "Recepta",
    COINAGE: "Waluta",
  },
  npcTypes: {
    COMMON: "Zwykły",
    ELITE: "Elita",
    ELITE2: "Elita II",
    ELITE3: "Elita III",
    HERO: "Heros",
    EVENT_HERO: "Heros eventowy",
    COLOSSUS: "Kolos",
    TITAN: "Tytan",
    NPC: "NPC",
  },
  items: {
    eyebrow: "Przedmioty",
    title: "Wyszukiwarka przedmiotów",
    description:
      "Znajdź przedmiot po nazwie. Zawęź wyniki według poziomu, rzadkości, typu i profesji.",
    statsLabel: "Statystyki",
    rarityLabel: "Rzadkość",
    typeLabel: "Typ",
    levelLabel: "Poziom",
    professionsLabel: "Profy",
  },
  npcs: {
    eyebrow: "NPC i potwory",
    title: "Wyszukiwarka NPC",
    description:
      "Znajdź NPC-a lub potwora po nazwie i sprawdź jego typ oraz poziom.",
    typeLabel: "Typ",
    levelLabel: "Poziom",
    worldLabel: "Świat",
  },
  players: {
    eyebrow: "Gracze",
    title: "Wyszukiwarka graczy",
    description:
      "Znajdź postać po nazwie i świecie. Sprawdź jej poziom oraz profesję.",
    professionLabel: "Profesja",
    worldLabel: "Świat",
    characterIdLabel: "ID postaci",
  },
} as const;

const translations = createTranslationLookup(messages);

function resolveMessage(path: string): string {
  const value = translations.get(path);

  if (value === undefined)
    throw new Error(`Missing translation for key: ${path}`);

  return value;
}

export function t(
  path: string,
  variables?: Record<string, string | number>,
): string {
  const template = resolveMessage(path);

  if (!variables) {
    return template;
  }

  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, variableName) => {
    const value = variables[variableName];

    return value === undefined ? "" : String(value);
  });
}
