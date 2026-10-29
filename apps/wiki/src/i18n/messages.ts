import { createTranslationLookup } from "@lootlog/ui/i18n/translation-lookup";

const messages = {
  meta: {
    title: "Lootlog Wiki",
    description:
      "Wiki Lootloga do wyszukiwania przedmiotów, NPC-ów i potworów z Margonem.",
    homeTitle: "Lootlog Wiki",
    itemsTitle: "Przedmioty",
    npcsTitle: "NPC i potwory",
    itemTitle: "Przedmiot",
    npcTitle: "Potwór",
    eventTitle: "Event",
  },
  navigation: {
    ariaLabel: "Wiki",
    skipToContent: "Przejdź do treści",
    home: "Start",
    items: "Przedmioty",
    npcs: "Potwory",
  },
  header: {
    searchLabel: "Szukaj przedmiotu",
    searchPlaceholder: "Szukaj przedmiotu",
  },
  slots: {
    helmet: "Hełm",
    ring: "Pierścień",
    necklace: "Naszyjnik",
    gloves: "Rękawice",
    weapon: "Broń",
    armor: "Zbroja",
    secondary: "Pomocnicza",
    boots: "Buty",
  },
  equipment: {
    title: "Mój zestaw",
    profession: "Profesja postaci",
    anyProfession: "Dowolna profesja",
    level: "Poziom postaci",
    levelPlaceholder: "Lvl",
    empty: "Załóż przedmioty, żeby zobaczyć sumę statystyk.",
    previewHint: "Najedź na przedmiot, żeby porównać go z zestawem.",
    previewing: "Porównanie: {{item}}",
    equip: "Załóż",
    worn: "Założony",
    unequip: "Zdejmij: {{item}}",
    findForSlot: "Szukaj: {{slot}}",
    share: "Udostępnij",
    copied: "Skopiowano link",
    failed: "Nie udało się skopiować",
    clear: "Wyczyść zestaw",
    issues: {
      profession: "Inna profesja.",
      level: "Za wysoki poziom.",
    },
  },
  uiLabels: {
    close: "Zamknij",
    sidebarTitle: "Nawigacja",
    sidebarDescription: "Menu nawigacji",
    toggleSidebar: "Przełącz menu boczne",
    commandPaletteTitle: "Paleta poleceń",
    commandPaletteDescription: "Wyszukaj polecenie",
    pagination: "Paginacja",
    previousPage: "Poprzednia strona",
    nextPage: "Następna strona",
    previous: "Poprzednia",
    next: "Następna",
    morePages: "Więcej stron",
  },
  userMenu: {
    signIn: "Zaloguj się przez Discord",
    signInShort: "Zaloguj",
    open: "Konto: {{name}}",
    signInFailed: "Nie udało się zalogować. Spróbuj ponownie.",
    openLootlog: "Otwórz Lootloga",
    appearance: "Wygląd",
    logout: "Wyloguj się",
  },
  home: {
    eyebrow: "Wiki Margonem",
    title: "Wszystko, co spada w Margonem",
    description:
      "Przedmioty, NPC i potwory z Margonem, uzupełniane na bieżąco danymi z Lootloga.",
    searchLabel: "Szukaj przedmiotu",
    searchPlaceholder: "Wpisz nazwę przedmiotu, np. dria, serce, łowca",
    searchSubmit: "Szukaj",
    raritiesTitle: "Przeglądaj według rzadkości",
    newMonstersTitle: "Nowe potwory",
    newMonstersDescription:
      "Herosi, tytani i kolosi z najnowszymi przedmiotami w grze.",
    newMonstersEmpty: "Lootlog nie zna jeszcze nowych potworów.",
    newEventItemsTitle: "Nowe przedmioty eventowe",
    newEventItemsDescription: "Najnowsze przedmioty z ostatnich eventów.",
    showAllEventItems: "Pokaż wszystkie",
    newEventItemsEmpty:
      "Lootlog nie zna jeszcze nowych przedmiotów eventowych.",
    sectionsTitle: "Działy wiki",
    quickSearchesLabel: "Szybkie wyszukiwania",
    quickSearches: {
      titanLegendaries: "Legendy z tytanów",
      colossusLegendaries: "Legendy z kolosów",
      heroHeroics: "Heroiki z herosów",
      highLevelLegendaries: "Legendy 250+ lvl",
    },
    bonusesTitle: "Szukaj po bonusie legendarnym",
    bonusUpcoming: "Wkrótce w grze",
    bonusesDescription:
      "Wybierz bonus, żeby zobaczyć wszystkie przedmioty, które go mają.",
    slotsTitle: "Przeglądaj według slotu",
    itemsDescription:
      "Szukaj przedmiotów po nazwie, poziomie, rzadkości i profesji.",
    npcsDescription: "Szukaj NPC-ów i potworów po nazwie.",
    open: "Otwórz",
  },
  catalog: {
    droppedBy: "Z:",
    droppedByTitle: "Wypada z",
    dropsTitle: "Dropy",
    dropRarities: {
      LEGENDARY: "Legendarne",
      HEROIC: "Heroiczne",
      UNIQUE: "Unikatowe",
      UPGRADED: "Ulepszone",
      COMMON: "Zwykłe",
    },
    noSourcesYet: "Lootlog nie zna jeszcze potwora, z którego wypada.",
    noDropsYet: "Lootlog nie zna jeszcze dropów tego potwora.",
    noCurrentDrops:
      "Z tego potwora nie wypada już żaden znany Lootlogowi drop.",
    retiredDrop: "Już nie wypada",
    retiredDropsTitle: "Dawniej wypadało",
    retiredDropsDescription:
      "Lootlog od dawna nie widział tych przedmiotów, choć potwór był bity wielokrotnie. Najpewniej po zmianie łupu już z niego nie wypadają.",
    itemNotFound: "Nie znaleziono przedmiotu.",
    npcNotFound: "Nie znaleziono potwora.",
    eventNotFound: "Nie znaleziono eventu.",
    eventDescription:
      "Przedmioty z eventu: {{count}}, według potworów i rzadkości.",
    eventOtherItems: "Pozostałe przedmioty",
    loadError: "Nie udało się pobrać danych. Spróbuj ponownie.",
  },
  search: {
    queryLabel: "Fraza",
    queryPlaceholder: "np. dria, serce, łowca",
    submit: "Szukaj",
    reset: "Wyczyść",
    loading: "Ładowanie wyników...",
    noResults: "Brak wyników dla podanych parametrów.",
    results: "Wyniki: {{count}}",
    resultsCapped: "Wyniki: ponad {{count}}",
    showMore: "Pokaż więcej",
    shown: "Pokazano {{shown}} z {{total}}",
  },
  common: {
    levelShort: "{{level}} lvl",
  },
  filters: {
    title: "Filtry",
    slot: "Slot ekwipunku",
    level: "Poziom",
    levelChip: "Poziom {{min}}–{{max}}",
    anySlot: "Każdy slot",
    levelBracket: "{{min}}–{{max}}",
    levelFrom: "{{min}}+",
    upcoming: "Wkrótce",
    clearSection: "Wyczyść: {{section}}",
    showResults: "Pokaż wyniki",
    activeCount: "Aktywne filtry: {{count}}",
    bosses: "Wypada z",
    bonuses: "Bonus legendarny",
    forCharacter: "Dla mojej postaci",
    forCharacterTitle: "Pokaż przedmioty dla profesji i poziomu z zestawu",
    stats: "Ma statystykę",
    statOptions: {
      crit: "Cios krytyczny",
      evade: "Unik",
      hp: "Życie",
      sa: "Szybkość ataku",
      pierce: "Przebicie",
      blok: "Blok",
      absorb: "Absorpcja",
    },
    otherTypes: "Pozostałe typy",
    remove: "Usuń filtr: {{filter}}",
    clearAll: "Wyczyść filtry",
    minLevel: "Poziom od",
    maxLevel: "Poziom do",
    minLevelPlaceholder: "1",
    maxLevelPlaceholder: "300",
    sort: "Sortowanie",
    sortOptions: {
      relevance: "Trafność",
      "id:desc": "Najnowsze w grze",
      "lvl:asc": "Poziom rosnąco",
      "lvl:desc": "Poziom malejąco",
      "name:asc": "Nazwa A-Z",
      "name:desc": "Nazwa Z-A",
    },
    rarity: "Rzadkość",
    profession: "Profesja",
    professions: {
      w: "Wojownik",
      p: "Paladyn",
      h: "Łowca",
      m: "Mag",
      b: "Tancerz ostrzy",
      t: "Tropiciel",
    },
  },
  legendaryBonus: {
    anguish: "Krwawa udręka",
    cleanse: "Płomienne oczyszczenie",
    critred: "Krytyczna osłona",
    curse: "Klątwa",
    dmgred: "Fizyczna osłona",
    facade: "Fasada opieki",
    frenzy: "Eskalacja szału",
    glare: "Oślepienie",
    holytouch: "Dotyk anioła",
    lastheal: "Ostatni ratunek",
    puncture: "Przeszywająca skuteczność",
    pushback: "Odrzut",
    resgain: "Ochrona żywiołów",
    retaliation: "Aura odwetu",
    verycrit: "Cios bardzo krytyczny",
  },
  itemRarity: {
    COMMON: "Zwykły",
    UNIQUE: "Unikat",
    HEROIC: "Heroik",
    UPGRADED: "Ulepszony",
    LEGENDARY: "Legendarny",
  },
  itemType: {
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
    title: "Wyszukiwarka przedmiotów",
    description:
      "Znajdź przedmiot po nazwie. Zawęź wyniki według slotu, poziomu, rzadkości, bonusu legendarnego i profesji.",
  },
  npcs: {
    title: "Wyszukiwarka NPC",
    description: "Znajdź NPC-a lub potwora po nazwie.",
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
