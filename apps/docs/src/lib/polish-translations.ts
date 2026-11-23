import type { Translations } from "fumadocs-ui/i18n";

export const docsTranslations = {
  metadata: {
    description:
      "Instrukcje instalacji, obsługi dodatku i panelu webowego Lootlog dla graczy Margonem.",
    title: "Dokumentacja Lootlog",
  },
  header: {
    closeNavigation: "Zamknij nawigację",
    menu: "Menu",
    navigation: "Nawigacja",
    section: "Dokumentacja",
    sites: "Serwisy Lootlog",
    skipToContent: "Przejdź do treści",
  },
  siteNames: {
    lootlog: "Lootlog",
    docs: "Dokumentacja",
    wiki: "Wiki",
    developer: "Dla programistów",
    github: "GitHub",
    discord: "Discord",
  },
  footer: {
    brand: "Lootlog",
    copyright: (year: number) => `© ${year} Lootlog · open source`,
    legalNotice:
      "Grafiki wykorzystane na stronie są własnością Garmory sp. z o.o.",
    navigation: "Linki w stopce",
    privacy: "Prywatność",
    tagline: "Darmowy dodatek open source do Margonem dla graczy i klanów.",
    terms: "Regulamin",
  },
  status: {
    backHome: "Wróć do dokumentacji",
    errorDescription:
      "Nie udało się wyświetlić tej strony. Spróbuj ponownie za chwilę.",
    errorTitle: "Coś poszło nie tak",
    notFoundDescription:
      "Adres jest nieaktualny albo strona została przeniesiona.",
    notFoundTitle: "Nie znaleźliśmy tej strony",
    retry: "Spróbuj ponownie",
  },
  editOnGitHub: "Edytuj na GitHubie",
  markdownActions: {
    copy: "Kopiuj dla AI",
    copied: "Skopiowano",
    copyFailed: "Nie udało się skopiować",
    view: "Wersja tekstowa",
  },
} as const;

export const polishTranslations = {
  "Close Search(search dialog)(aria-label)": "Zamknij wyszukiwanie",
  "Close Sidebar(aria-label)": "Zamknij nawigację",
  "Close Sidebar(sidebar)(aria-label)": "Zamknij nawigację",
  "Collapse Sidebar(sidebar)(aria-label)": "Zwiń nawigację",
  "Copied Text(code block)(aria-label)": "Skopiowano kod",
  "Copy Anchor Link(heading anchor)(aria-label)": "Skopiuj link do nagłówka",
  "Copy Text(code block)(aria-label)": "Skopiuj kod",
  "Next Page(pagination)": "Następna strona",
  "No Headings(table of contents)": "Brak nagłówków",
  "No results found(search dialog)": "Brak wyników",
  "On this page(table of contents)": "Na tej stronie",
  "Open Search(search trigger)(aria-label)": "Otwórz wyszukiwanie",
  "Open Sidebar(sidebar)(aria-label)": "Otwórz nawigację",
  "Previous Page(pagination)": "Poprzednia strona",
  "Search(search dialog)": "Szukaj w dokumentacji",
  "Search(search trigger)": "Szukaj",
  "Show Sidebar(sidebar)": "Pokaż nawigację",
  "Table of Contents(inline table of contents)": "Spis treści",
  "Toggle Menu(mobile menu)(aria-label)": "Przełącz menu",
  displayName: "Polski",
} satisfies Partial<Translations>;
