/** Player-facing Polish copy for slash commands, matching the Web app's terms. */
import type { CommandFailure } from "./lootlog-client.js";

const NPC_TYPE_LABELS = new Map(
  Object.entries({
    TITAN: "Tytan",
    COLOSSUS: "Kolos",
    HERO: "Heros",
    EVENT_HERO: "Heros eventowy",
    NPC: "NPC",
    ELITE3: "Elita III",
    ELITE2: "Elita II",
    ELITE: "Elita",
    COMMON: "Zwykły",
  }),
);

export const npcTypeLabel = (type: string) => NPC_TYPE_LABELS.get(type) ?? type;

export const KILL_PERIODS = ["24h", "3d", "7d", "14d", "30d", "all"] as const;

export type KillPeriod = (typeof KILL_PERIODS)[number];

export const PERIOD_LABELS: Readonly<Record<KillPeriod, string>> = {
  "24h": "Ostatnie 24 godziny",
  "3d": "Ostatnie 3 dni",
  "7d": "Ostatni tydzień",
  "14d": "Ostatnie 2 tygodnie",
  "30d": "Ostatni miesiąc",
  all: "Wszystko",
};

const RARITY_LABELS = new Map(
  Object.entries({
    UNIQUE: "Unikatowy",
    HEROIC: "Heroiczny",
    UPGRADED: "Ulepszony",
    LEGENDARY: "Legendarny",
  }),
);

export const rarityLabel = (rarity: string) => RARITY_LABELS.get(rarity);

// The frame colors of item images on the Web, as Discord can draw them.
const RARITY_MARKS = new Map(
  Object.entries({ UNIQUE: "🟨", HEROIC: "🟦", LEGENDARY: "🟧" }),
);

export const rarityMark = (rarity: string) => RARITY_MARKS.get(rarity);

export const COMMAND_TEXT = {
  visibilityOption: "Pokaż odpowiedź wszystkim na kanale",
  periodOption: "Okres",
  worldOption: "Świat",
  ranking: {
    description: "Ranking bić członków Lootloga",
    typeOption: "Typ potworów",
    title: (type: string, period: string) =>
      `🏆 Ranking bić: ${type} · ${period}`,
    empty: "Nikt jeszcze nie ma bić tego typu w wybranym okresie.",
    footer: (kills: number) => `⚔️ Unikalnych bić Lootloga: ${kills}`,
    kills: (count: number) => `${count} bić`,
    ownMissing: "Nie masz bić tego typu w wybranym okresie.",
  },
  statistics: {
    description: "Bicia członka Lootloga według typu potworów",
    playerOption: "Członek Lootloga (domyślnie Ty)",
    title: (name: string, period: string) =>
      `📊 Statystyki: ${name} · ${period}`,
    emptyTitle: (period: string) => `📊 Statystyki · ${period}`,
    empty: "Brak bić w wybranym okresie.",
    total: "⚔️ Wszystkie bicia",
    position: "🏆 Miejsce w rankingu",
    positionValue: (position: number, members: number) =>
      `**${position}.** z ${members}`,
    byType: "Według typu",
  },
  npc: {
    description: "Kto najczęściej bije wybranego potwora",
    nameOption: "Nazwa potwora",
    title: (name: string, level: number) => `⚔️ ${name} (${level} lvl)`,
    kills: "Unikalnych bić Lootloga",
    participations: "Udziałów członków",
    killers: "Najczęściej biją",
    empty: "Nikt z Lootloga nie bił tego potwora w wybranym okresie.",
    notFound: "Lootlog nie ma bić tego potwora. Wybierz go z podpowiedzi.",
    ownMissing: "Nie masz bić tego potwora w wybranym okresie.",
  },
  timers: {
    description: "Najbliższe respawny z timerów Lootloga",
    typeOption: "Typ potworów",
    title: "⏱️ Najbliższe respawny",
    empty: "Brak aktywnych timerów.",
    windowOpen: (until: string) => `🟢 okno trwa, koniec ${until}`,
    window: (from: string, until: string) => `⏳ od ${from} do ${until}`,
    more: (count: number) => `…i ${count} więcej na stronie Lootloga.`,
  },
  timer: {
    description: "Okno respawnu jednego potwora",
    npcOption: "Potwór z timerów Lootloga",
    notFound: "Ten timer już nie istnieje. Wybierz potwora z podpowiedzi.",
    window: "⏱️ Okno respawnu",
    world: "🌍 Świat",
    location: "🗺️ Mapa",
    reportedBy: "📣 Zgłosił",
    reset: "↺ Timer został zresetowany ręcznie.",
  },
  reservations: {
    description: "Rezerwacje miejsc expienia",
    mineDescription: "Twoje nadchodzące rezerwacje",
    spotsDescription: "Miejsca expienia tego Lootloga i ich dostępność",
    mineTitle: "📅 Twoje nadchodzące rezerwacje",
    mineEmpty: "Nie masz nadchodzących rezerwacji.",
    spotsTitle: "📍 Miejsca expienia",
    spotsEmpty: "Ten Lootlog nie ma jeszcze miejsc rezerwacji.",
    free: "🟢 wolne",
    taken: (author: string, until: string) =>
      `🔴 zajęte przez ${author} do ${until}`,
    next: (author: string, from: string) => `↳ następnie ${author} od ${from}`,
  },
  events: {
    description: "Eventy Lootloga",
    rankingDescription: "Ranking punktów eventu",
    statusDescription: "Herosi eventu i ich okna respawnu",
    summaryDescription: "Podsumowanie eventu",
    eventOption: "Event (domyślnie trwający)",
    none: "Ten Lootlog nie ma żadnego eventu.",
    notFound: "Nie ma takiego eventu. Wybierz go z podpowiedzi.",
    rankingTitle: (name: string) => `🏆 Ranking eventu: ${name}`,
    rankingEmpty: "Nikt jeszcze nie zdobył punktów w tym evencie.",
    ownMissing: "Nie masz jeszcze punktów w tym evencie.",
    moreHeroes: (count: number) =>
      `Kolejni herosi (${count}) są na stronie Lootloga.`,
    points: (points: number, kills: number) => `${points} pkt · ${kills} bić`,
    statusTitle: (name: string) => `🎪 Event: ${name}`,
    active: "Trwa",
    finished: "Zakończony",
    activeBadge: "🟢 Trwa",
    finishedBadge: "⚪ Zakończony",
    heroes: "⚔️ Herosi",
    noHeroes: "Event nie ma jeszcze herosów.",
    noTimer: "brak timera",
    summaryTitle: (name: string) => `🎉 Podsumowanie eventu: ${name}`,
    summaryUnavailable: "Podsumowanie tego eventu nie jest jeszcze dostępne.",
    summary: {
      kills: "⚔️ Bicia",
      participants: "👥 Uczestnicy",
      points: "⭐ Punkty",
      coverage: "🛡️ Pokrycie okien",
      loots: "💰 Łupy",
      leaders: "🏅 Wyróżnienia",
      topHunter: "🏹 Najwięcej bić",
      topScorer: "⭐ Najwięcej punktów",
      longestDuty: "⏱️ Najdłuższy dyżur",
      own: "🙋 Twój wynik",
      ownResult: (
        position: number,
        members: number,
        points: string,
        kills: number,
      ) =>
        `**${position}.** miejsce z ${members} · ${points} pkt · ${kills} bić`,
    },
  },
  loots: {
    description: "Ostatnie łupy Lootloga",
    playerOption: "Nick postaci",
    npcOption: "Nazwa potwora",
    rarityOption: "Rzadkość przedmiotu",
    title: "💰 Ostatnie łupy",
    empty: "Brak łupów pasujących do filtrów.",
  },
  item: {
    description: "Kto i z czego zdobył przedmiot",
    nameOption: "Nazwa przedmiotu",
    title: (name: string) => `🎒 Przedmiot: ${name}`,
    empty: "Nikt z Lootloga nie zdobył jeszcze tego przedmiotu.",
  },
  online: {
    description: "Kto z Lootloga jest teraz w grze",
    title: (count: number) => `🟢 W grze: ${count}`,
    empty: "Nikogo z Lootloga nie ma teraz w grze.",
    world: (world: string, count: number, afk: number) =>
      `🌍 ${world}: **${count}**${afk > 0 ? ` · 💤 ${afk} AFK` : ""}`,
  },
  card: {
    description: "Karta ze statystykami łupów Lootloga",
    unavailable:
      "Ten serwer nie ma Lootloga albo jego publiczna karta statystyk jest wyłączona. Administrator może ją włączyć w ustawieniach Lootloga.",
  },
  lootlog: {
    description: "Informacje o Lootlogu na tym serwerze",
    linkDescription: "Linki do Lootloga tego serwera i instrukcji instalacji",
    diagnosticsDescription: "Sprawdź połączenie konta i uprawnienia bota",
    linkTitle: "🔗 Lootlog tego serwera",
    linkBody:
      "Lootlog zbiera timery, łupy i bicia prosto z gry. Zainstaluj dodatek i zaloguj się przez Discorda.",
    diagnosticsTitle: "🩺 Diagnostyka Lootloga",
    account: "👤 Konto",
    accountLinked: "✅ Połączone z Lootlogiem tego serwera.",
    accountNotLinked:
      "⚠️ Nie widzę Twojego konta w Lootlogu tego serwera. Zaloguj się na stronie Lootloga i otwórz Lootlog tego serwera.",
    accountUnavailable: "⚠️ Nie udało się sprawdzić konta. Spróbuj za chwilę.",
    channel: "🔐 Uprawnienia bota na tym kanale",
    channelReady: "✅ Bot może wysyłać tu powiadomienia.",
    channelMissing: (permissions: string) =>
      `⚠️ Brakuje uprawnień: ${permissions}`,
  },
  buttons: {
    openLootlog: "Otwórz w Lootlogu",
    installation: "Instalacja dodatku",
  },
} as const;

export const FAILURE_MESSAGES: Readonly<
  Record<CommandFailure["reason"], string>
> = {
  "not-linked":
    "⚠️ Nie widzę Twojego konta w Lootlogu tego serwera. Zaloguj się przez Discorda na stronie Lootloga, otwórz Lootlog tego serwera i spróbuj ponownie.",
  reauthenticate:
    "⚠️ Twoje logowanie przez Discorda w Lootlogu wygasło. Zaloguj się ponownie na stronie Lootloga.",
  forbidden: "⚠️ Twoja rola w Lootlogu nie ma dostępu do tych danych.",
  "not-found": "⚠️ Nie znaleziono tych danych w Lootlogu.",
  unavailable: "⚠️ Lootlog chwilowo nie odpowiada. Spróbuj ponownie za chwilę.",
};

export const UNKNOWN_COMMAND = "Ta komenda nie jest już dostępna.";
