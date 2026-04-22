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
  theme: {
    auto: "Auto",
    dark: "Ciemny",
    light: "Jasny",
    autoLabel:
      "Tryb motywu: automatyczny. Kliknij, aby przełączyć na tryb jasny.",
    darkLabel: "Tryb motywu: ciemny. Kliknij, aby przełączyć tryb.",
    lightLabel: "Tryb motywu: jasny. Kliknij, aby przełączyć tryb.",
  },
  footer: {
    copyright: "Lootlog",
    builtWith: "Wiki na TanStack Start i Cloudflare Workers",
  },
  home: {
    eyebrow: "Wiki i wyszukiwarka",
    title: "Jedna aplikacja do szukania wszystkiego, co ważne w grze.",
    description:
      "Start oparty o TanStack Start z publicznymi route'ami pod SEO i klientowym search flow pod ciężkie filtry oraz facety.",
    itemsTitle: "Przedmioty",
    itemsDescription:
      "Przeszukuj itemy po nazwie, statystykach i filtrach Meilisearch.",
    npcsTitle: "NPC i potwory",
    npcsDescription:
      "Znajduj NPC-ów po nazwie, typie i świecie bez przeładowywania strony.",
    playersTitle: "Gracze",
    playersDescription:
      "Szukaj postaci po nazwie i świecie w osobnym, lekkim indeksie.",
    statusEyebrow: "Aktualny setup",
    statusTitle: "V1 stawia fundament pod publiczną wiki.",
    statusDescription:
      "Nowa appka działa na TanStack Start, ma route'y pod publiczne sekcje i jest gotowa do rozwijania stron encji oraz bardziej zaawansowanych kart wiedzy.",
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
    error: "Nie udało się pobrać wyników z serwisu search.",
    noResults: "Brak wyników dla podanych parametrów.",
    results: "Wyniki: {{count}}",
    iconAlt: "Ikona {{name}}",
    missingValue: "brak",
    apiHint:
      "Wyniki pobierane są klientowo z istniejącego `apps/search`, więc URL możesz bezpośrednio udostępnić innym graczom.",
  },
  items: {
    eyebrow: "Przedmioty",
    title: "Wyszukiwarka przedmiotów",
    description:
      "Na starcie trzymamy search i filtry po kliencie, ale sama strona i routing są już gotowe pod SSR oraz publiczne linkowanie.",
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
      "Sekcja korzysta z tego samego publicznego backendu search i jest gotowa pod przyszłe strony encji.",
    typeLabel: "Typ",
    levelLabel: "Poziom",
    worldLabel: "Świat",
  },
  players: {
    eyebrow: "Gracze",
    title: "Wyszukiwarka graczy",
    description:
      "Lekkie wyszukiwanie po nazwie i świecie pod publiczne linki oraz dalszą rozbudowę profilowych podstron.",
    professionLabel: "Profesja",
    worldLabel: "Świat",
    characterIdLabel: "ID postaci",
  },
} as const;

function resolveMessage(path: string): string {
  const value = path.split(".").reduce<unknown>((currentValue, segment) => {
    if (
      currentValue &&
      typeof currentValue === "object" &&
      segment in currentValue
    ) {
      return (currentValue as Record<string, unknown>)[segment];
    }

    return undefined;
  }, messages);

  if (typeof value !== "string") {
    throw new Error(`Missing translation for key: ${path}`);
  }

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
