import type { AdminAuditEntryAction } from "@lootlog/client/auth";
import type { PersonalCharacterAuraId } from "@lootlog/schema/character-aura";
import type { PlatformRole } from "@lootlog/schema/platform-roles";
import type { BanDuration, UserAction } from "@/lib/user-action";

export const roleText: Record<
  PlatformRole,
  { readonly name: string; readonly description: string }
> = {
  admin: {
    name: "Administrator",
    description:
      "Ma uprawnienia wszystkich pozostałych ról, jako jedyny nadaje i odbiera aury oraz nosi aury administratorów. Nadawaj tylko osobom, którym ufasz w pełni.",
  },
  "wiki-moderator": {
    name: "Moderator Wiki",
    description:
      "Przegląda zgłoszenia błędów na stronach wiki: zatwierdza je, odrzuca i otwiera ponownie.",
  },
  "global-chat-admin": {
    name: "Administrator czatu globalnego",
    description:
      "Usuwa i przypina wiadomości, wycisza graczy i pisze ogłoszenia na wszystkie światy. Zmiana działa w ciągu minuty.",
  },
};

export const banDurationText: Record<BanDuration, string> = {
  "1h": "1 godzina",
  "24h": "24 godziny",
  "7d": "7 dni",
  "30d": "30 dni",
  permanent: "Bezterminowo",
};

export const noticeText: Record<UserAction["action"], string> = {
  roles: "Zapisano role.",
  ban: "Użytkownik został zbanowany, a jego sesje zakończone.",
  unban: "Zdjęto bana.",
  "revoke-sessions": "Zakończono wszystkie sesje użytkownika.",
  "revoke-session": "Zakończono sesję.",
  "revoke-api-key": "Usunięto klucz API.",
  "grant-auras": "Użytkownik może teraz wybrać aurę w ustawieniach Lootloga.",
  "grant-personal-aura":
    "Użytkownik może teraz wybrać aurę osobistą w ustawieniach Lootloga.",
  "revoke-auras": "Odebrano aury.",
};

export const personalAuraText: Record<PersonalCharacterAuraId, string> = {
  skyborne: "Podniebie",
  joker: "Joker",
  nightowl: "Nocna sowa",
  sunder: "Rozdzielenie",
  fortyfour: "Czterdzieści i cztery",
  thirteenth: "Trzynasta godzina",
  ninepins: "Dziewięć szpilek",
  threefaces: "Trzy twarze",
  twineyes: "Dwoje oczu",
  tulipwind: "Tulipanowy wiatr",
};

export const auditActionText: Record<AdminAuditEntryAction, string> = {
  "roles.set": "Zmiana ról",
  "ban.set": "Ban",
  "ban.lift": "Zdjęcie bana",
  "sessions.revoke": "Wylogowanie ze wszystkich urządzeń",
  "session.revoke": "Zakończenie sesji",
  "api-key.revoke": "Usunięcie klucza API",
};

export const text = {
  title: "Lootlog Admin",
  navUsers: "Użytkownicy",
  navAudit: "Dziennik",
  operator: "Operator",
  signInTitle: "Zaloguj się do Lootloga",
  signInDescription:
    "Panel otwiera się tylko dla zalogowanego konta administratora. Zaloguj się w Lootlogu przez Discord i wróć tutaj.",
  notAdminTitle: "To konto nie ma dostępu",
  notAdminDescription:
    "Zalogowane konto Lootlog nie jest na liście administratorów (ADMIN_ACCOUNT_IDS). Zaloguj się w Lootlogu na właściwe konto i wróć tutaj.",
  signInOpen: "Otwórz Lootlog",
  signInRetry: "Spróbuj ponownie",
  skipToContent: "Przejdź do treści",

  overviewUsers: "Użytkownicy",
  overviewBanned: "Zbanowani",
  overviewSessions: "Aktywne sesje",

  filterSearch: "Szukaj",
  filterSearchPlaceholder: "Nazwa, e-mail, ID użytkownika lub Discord ID",
  filterRole: "Rola",
  filterAnyRole: "Dowolna",
  filterStatus: "Status",
  filterAnyStatus: "Wszyscy",
  filterBanned: "Zbanowani",
  filterNotBanned: "Bez bana",
  filterAura: "Aury",
  filterAnyAura: "Wszyscy",
  filterWithAura: "Z nadanymi aurami",
  filterWithoutAura: "Bez nadanych aur",
  filterApply: "Filtruj",
  filterClear: "Wyczyść",

  columnUser: "Użytkownik",
  columnRoles: "Role",
  columnStatus: "Status",
  columnSessions: "Sesje",
  columnJoined: "Dołączył",
  statusActive: "Aktywny",
  statusBanned: "Zbanowany",
  noRoles: "Brak",
  usersEmpty: "Nikt nie pasuje do tych filtrów.",
  usersCount: (shown: number, total: number) => `${shown} z ${total}`,
  previousPage: "Poprzednia strona",
  nextPage: "Następna strona",
  page: (page: number, pages: number) => `Strona ${page} z ${pages}`,

  backToUsers: "Wszyscy użytkownicy",
  userId: "ID użytkownika",
  discordId: "Discord ID",
  email: "E-mail",
  joined: "Dołączył",
  bannedUntil: (date: string) => `Ban do ${date}`,
  bannedPermanently: "Ban bezterminowy",
  banReason: "Powód",
  noBanReason: "Nie podano powodu.",

  rolesHeading: "Role",
  rolesDescription:
    "Zmiana działa od razu w panelu, a w usługach w ciągu kilku minut.",
  rolesSave: "Zapisz role",

  banHeading: "Ban",
  banDescription:
    "Ban kończy wszystkie sesje, blokuje logowanie i unieważnia klucze API użytkownika. Otwarta karta może działać jeszcze do 5 minut.",
  banOwnAccount: "Nie możesz zbanować własnego konta.",
  banReasonLabel: "Powód bana",
  banReasonHint: "Zobaczysz go tutaj i w dzienniku. Użytkownik go nie widzi.",
  banDurationLabel: "Czas trwania",
  banSubmit: "Zbanuj użytkownika",
  unbanSubmit: "Zdejmij bana",

  sessionsHeading: "Sesje",
  sessionsDescription:
    "Zakończona sesja traci dostęp najpóźniej po 5 minutach.",
  sessionsEmpty: "Użytkownik nie ma aktywnych sesji.",
  sessionDevice: "Urządzenie",
  sessionIp: "Adres IP",
  sessionLastActive: "Ostatnia aktywność",
  sessionExpires: "Wygasa",
  sessionRevoke: "Zakończ",
  sessionRevokeLabel: (device: string) => `Zakończ sesję: ${device}`,
  sessionsRevokeAll: "Wyloguj ze wszystkich urządzeń",
  unknownDevice: "Nieznane urządzenie",
  unknownIp: "Brak",

  apiKeysHeading: "Klucze API",
  apiKeysEmpty: "Użytkownik nie ma kluczy API.",
  apiKeyName: "Nazwa",
  apiKeyStart: "Początek",
  apiKeyCreated: "Utworzony",
  apiKeyExpires: "Wygasa",
  apiKeyNever: "Nigdy",
  apiKeyRevoke: "Usuń",
  apiKeyRevokeLabel: (name: string) => `Usuń klucz API: ${name}`,
  apiKeyUnnamed: "Bez nazwy",

  auditHeading: "Dziennik",
  auditDescription: "Wszystko, co zrobiono w tym panelu, od najnowszych.",
  auditUserHeading: "Historia działań",
  auditEmpty: "Brak wpisów.",
  auditWhen: "Kiedy",
  auditActor: "Operator",
  auditAction: "Działanie",
  auditTarget: "Użytkownik",
  auditDetails: "Szczegóły",
  auditDeletedUser: "Usunięty użytkownik",
  auditIncomplete: "Nieukończone",
  auditIncompleteHint:
    "Działanie nie powiodło się albo zostało przerwane i mogło wykonać się częściowo. Sprawdź aktualny stan użytkownika.",

  aurasHeading: "Aury",
  aurasDescription:
    "Nadania dotyczą tego użytkownika. Aurę założy na postaciach z kont Margonem, na których potwierdził grę w Lootlogu.",
  aurasForbidden:
    "Aury nadaje i odbiera tylko konto z rolą Administrator. Nadaj tę rolę swojemu kontu; zmiana działa w ciągu minuty.",
  aurasAdmin:
    "Administrator: wybiera każdą aurę bez nadania, a odebranie nadań nie zdejmuje jego aur.",
  aurasGeneralHeading: "Wybór aur",
  aurasGeneralDescription:
    "Pozwala wybrać każdą aurę poza aurami administratorów i osobistymi.",
  aurasGranted: "Nadane",
  aurasNotGranted: "Brak",
  aurasGrant: "Nadaj aury",
  aurasPersonalHeading: "Aury osobiste",
  aurasPersonalDescription:
    "Każdą nadaje się osobno; nadanie aur nie obejmuje aur osobistych.",
  aurasGrantPersonal: "Nadaj",
  aurasGrantPersonalLabel: (aura: string) => `Nadaj aurę osobistą: ${aura}`,
  aurasRevoke: "Odbierz wszystkie aury",
  aurasRevokeConfirmTitle: (name: string) =>
    `Odebrać aury użytkownikowi ${name}?`,
  aurasRevokeConfirmDescription:
    "Znikną nadanie aur i wszystkie aury osobiste, a postacie użytkownika od razu przestaną nosić wybrane aury.",

  cancel: "Anuluj",
  banConfirmTitle: (name: string) => `Zbanować użytkownika ${name}?`,
  banConfirmDescription:
    "Wszystkie sesje zostaną zakończone, a logowanie i klucze API zablokowane do czasu zdjęcia bana.",
  unbanConfirmTitle: (name: string) => `Zdjąć bana użytkownikowi ${name}?`,
  unbanConfirmDescription: "Użytkownik będzie mógł zalogować się ponownie.",
  revokeAllConfirmTitle: (name: string) =>
    `Wylogować użytkownika ${name} ze wszystkich urządzeń?`,
  revokeAllConfirmDescription:
    "Użytkownik będzie musiał zalogować się ponownie przez Discord. To nie blokuje logowania.",
  apiKeyConfirmTitle: (name: string) => `Usunąć klucz API „${name}”?`,
  apiKeyConfirmDescription:
    "Integracja korzystająca z tego klucza przestanie działać. Klucza nie da się przywrócić.",
  actionFailed: "Nie udało się wykonać działania. Spróbuj ponownie.",
  notFoundTitle: "Nie znaleziono",
  notFoundDescription: "Taka strona albo taki użytkownik nie istnieje.",
  errorTitle: "Coś poszło nie tak",
  errorDescription:
    "Usługa auth nie odpowiedziała poprawnie. Odśwież stronę za chwilę.",
} as const;
