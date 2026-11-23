import type { AdminAuditAction } from "@lootlog/schema/admin";
import type {
  AdminOrganizationSort,
  AdminOrganizationStatus,
  OrganizationOperatorAction,
} from "@lootlog/schema/admin-organizations";
import type { DiscordGuildSyncStatus } from "@lootlog/schema/discord";
import type { PersonalCharacterAuraId } from "@lootlog/schema/character-aura";
import type { PlatformRole } from "@lootlog/schema/platform-roles";
import type { Plan } from "@lootlog/schema/plans";
import type { PlanPeriod, PlanValidityChoice } from "@/lib/plan-validity";
import type { OrganizationAction } from "@/lib/organization-action";
import type { BanDuration, UserAction } from "@/lib/user-action";

export const roleText: Record<
  PlatformRole,
  { readonly name: string; readonly description: string }
> = {
  admin: {
    name: "Administrator",
    description:
      "Ma uprawnienia wszystkich pozostałych ról i nosi aury administratorów. Nadawaj tylko osobom, którym ufasz w pełni.",
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
  plan: "Zapisano plan i limity.",
  "grant-personal-aura":
    "Użytkownik może teraz wybrać aurę osobistą w ustawieniach Lootloga.",
  "revoke-personal-auras": "Odebrano aury osobiste.",
};

export const planText: Record<Plan, string> = {
  free: "Free",
  premium: "Premium",
};

export const planValidityText: Record<PlanValidityChoice, string> = {
  keep: "Bez zmian",
  unlimited: "Bezterminowo",
  "30d": "30 dni od teraz",
  "90d": "90 dni od teraz",
  "365d": "365 dni od teraz",
};

export const planExtensionText: Record<PlanPeriod, string> = {
  "30d": "Przedłuż o 30 dni",
  "90d": "Przedłuż o 90 dni",
  "365d": "Przedłuż o 365 dni",
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

export const auditActionText: Record<AdminAuditAction, string> = {
  "roles.set": "Zmiana ról",
  "ban.set": "Ban",
  "ban.lift": "Zdjęcie bana",
  "sessions.revoke": "Wylogowanie ze wszystkich urządzeń",
  "session.revoke": "Zakończenie sesji",
  "api-key.revoke": "Usunięcie klucza API",
};

export const organizationStatusText: Record<AdminOrganizationStatus, string> = {
  active: "Aktywny",
  suspended: "Zawieszony",
  inactive: "Bot poza serwerem",
};

export const syncStatusText: Record<DiscordGuildSyncStatus, string> = {
  SYNCED: "Zsynchronizowany",
  SYNCING: "Synchronizuje się",
  FAILED: "Błąd",
  STALE: "Nieaktualny",
  NOT_FOUND: "Serwer niedostępny",
};

export const organizationSortText: Record<AdminOrganizationSort, string> = {
  created: "Najnowsze",
  members: "Najwięcej członków",
  activity: "Ostatni loot",
};

export const memberTypeText: Record<
  "OWNER" | "ADMIN" | "USER" | "BOT",
  string
> = {
  OWNER: "Właściciel",
  ADMIN: "Administrator",
  USER: "Członek",
  BOT: "Bot",
};

export const organizationNoticeText: Record<
  OrganizationAction["action"],
  string
> = {
  plan: "Zapisano plan i limity.",
  "clear-vanity-url":
    "Usunięto własny adres. Lootlog jest dostępny pod ID serwera.",
  "refresh-discord-sync": "Odświeżono stan serwera Discord.",
  suspend:
    "Lootlog został zawieszony. Członkowie tracą dostęp w ciągu kilku sekund.",
  resume: "Przywrócono Lootlog.",
};

export const organizationAuditActionText: Record<
  OrganizationOperatorAction,
  string
> = {
  "limits.set": "Zmiana planu i limitów",
  "vanity-url.clear": "Usunięcie własnego adresu",
  "discord-sync.refresh": "Odświeżenie Discorda",
  suspend: "Zawieszenie",
  resume: "Przywrócenie",
};

const polishPlural = new Intl.PluralRules("pl");

const permissionForms: Partial<Record<Intl.LDMLPluralRule, string>> = {
  one: "uprawnienie",
  few: "uprawnienia",
  many: "uprawnień",
};

export const text = {
  title: "Lootlog Admin",
  navUsers: "Użytkownicy",
  navAudit: "Dziennik",
  navOrganizations: "Lootlogi",
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
  aurasUnavailable:
    "Nie udało się wczytać aur. Odśwież stronę za chwilę; pozostałe dane użytkownika są aktualne.",
  aurasAdmin:
    "Administrator: wybiera każdą aurę bez nadania, a odebranie nadań nie zdejmuje jego aur.",
  aurasGeneral: (allowed: boolean) =>
    allowed
      ? "Może wybrać każdą aurę poza aurami administratorów i osobistymi. Wybór aur daje plan albo nadpisanie w sekcji Plan."
      : "Nie może wybierać aur ogólnych. Wybór aur daje plan Premium albo nadpisanie w sekcji Plan.",
  aurasGranted: "Nadane",
  aurasNotGranted: "Brak",
  aurasPersonalHeading: "Aury osobiste",
  aurasPersonalDescription: "Każdą nadaje się osobno i nie zależy od planu.",
  aurasGrantPersonal: "Nadaj",
  aurasGrantPersonalLabel: (aura: string) => `Nadaj aurę osobistą: ${aura}`,
  aurasRevoke: "Odbierz aury osobiste",
  aurasRevokeConfirmTitle: (name: string) =>
    `Odebrać aury osobiste użytkownikowi ${name}?`,
  aurasRevokeConfirmDescription:
    "Postacie użytkownika od razu przestaną nosić aury osobiste. Aury ogólne zależą od planu i zostają.",

  planHeading: "Plan",
  planUserDescription:
    "Plan i nadpisania limitów tego użytkownika. Obniżenie limitu nie usuwa istniejących elementów; blokuje tylko tworzenie nowych.",
  planOrganizationDescription:
    "Plan i nadpisania limitów tego Lootloga. Obniżenie limitu nie usuwa istniejących dokumentów ani reguł; blokuje tylko tworzenie nowych.",
  planUnavailable:
    "Nie udało się wczytać planu. Odśwież stronę za chwilę; pozostałe dane użytkownika są aktualne.",
  planLabel: "Plan",
  planValidityLabel: "Ważność",
  planValidityKeepUntil: (date: string) => `Bez zmian (do ${date})`,
  planStatusFree: "Plan Free",
  planStatusUnlimited: (plan: string) => `Plan ${plan} bezterminowo`,
  planStatusUntil: (plan: string, date: string) => `Plan ${plan} do ${date}`,
  planStatusExpired: (date: string) =>
    `Plan Premium wygasł ${date}; obowiązuje Free`,
  planChanged: (date: string) => `Ostatnia zmiana: ${date}`,
  planOverridesHeading: "Nadpisania",
  planOverridesDescription:
    "Puste pole oznacza wartość z planu. Nadpisanie obowiązuje także po wygaśnięciu planu, dopóki go nie usuniesz.",
  planLimitPlaceholder: (value: string) => `Z planu: ${value}`,
  planFeatureFromPlan: (value: string) => `Z planu: ${value}`,
  planFeatureOn: "Tak",
  planFeatureOff: "Nie",
  planSave: "Zapisz plan",
  planLimitDocuments: "Dokumenty",
  planLimitNotificationRules: "Reguły powiadomień",
  planLimitPersonalRules: "Reguły powiadomień osobistych",
  planLimitWatchedItems: "Obserwowane przedmioty",
  planLimitCustomThemes: "Własne motywy",
  planLimitApiKeys: "Aktywne klucze API",
  planFeatureCharacterAuras: "Wybór aur",

  cancel: "Anuluj",
  confirmWord: "POTWIERDZAM",
  confirmWordLabel: (word: string) => `Wpisz ${word}, aby potwierdzić.`,
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
  notFoundDescription:
    "Taka strona, taki użytkownik albo taki Lootlog nie istnieje.",
  organizationsOverviewTotal: "Lootlogi",
  organizationsOverviewActive: "Aktywne",
  organizationsOverviewActiveLastWeek: "Z lootem w 7 dni",
  organizationsOverviewSuspended: "Zawieszone",
  organizationsOverviewSyncFailing: "Błąd Discorda",

  organizationsFilterSearchPlaceholder:
    "Nazwa, własny adres, ID serwera lub Discord ID właściciela",
  organizationsFilterStatus: "Status",
  organizationsFilterAnyStatus: "Wszystkie",
  organizationsFilterSync: "Discord",
  organizationsFilterAnySync: "Dowolny",
  organizationsFilterPermissions: "Uprawnienia bota",
  organizationsFilterAnyPermissions: "Dowolne",
  organizationsFilterMissingPermissions: "Brakuje uprawnień",
  organizationsFilterAllPermissions: "Komplet uprawnień",
  organizationsFilterSort: "Sortuj",

  organizationsEmpty: "Żaden Lootlog nie pasuje do tych filtrów.",
  organizationsCount: (shown: number, total: number) => `${shown} z ${total}`,
  columnOrganization: "Lootlog",
  columnOwner: "Właściciel",
  columnMembers: "Członkowie",
  columnLastLoot: "Ostatni loot",
  columnDiscord: "Discord",
  columnCreated: "Utworzony",
  noLoot: "Brak",
  unknownOwner: "Nieznany",
  missingPermissionsBadge: "Brak uprawnień",

  backToOrganizations: "Wszystkie Lootlogi",
  organizationId: "ID serwera",
  vanityUrl: "Własny adres",
  noVanityUrl: "Brak",
  owner: "Właściciel",
  created: "Utworzony",
  openInLootlog: "Otwórz w Lootlogu",

  usageMembers: "Aktywni członkowie",
  usageInactiveMembers: "Nieaktywni członkowie",
  usageLootsLastMonth: "Loot w 30 dni",
  usageDocuments: (limit: number) => `Dokumenty (limit ${limit})`,
  usageNotificationRules: (limit: number) =>
    `Reguły powiadomień (limit ${limit})`,

  suspensionHeading: "Zawieszenie",
  suspensionDescription:
    "Zawieszony Lootlog znika członkom z aplikacji, dodatku i bota. Dane zostają, a zbieranie lootu i powiadomienia stoją do przywrócenia.",
  suspendedSince: (date: string) => `Zawieszony od ${date}`,
  suspendedBy: (name: string) => `Zawiesił: ${name}`,
  suspensionReason: "Powód",
  suspendReasonLabel: "Powód zawieszenia",
  suspendReasonHint:
    "Zobaczysz go tutaj i w dzienniku. Członkowie go nie widzą.",
  suspendSubmit: "Zawieś Lootlog",
  suspendConfirmTitle: (name: string) => `Zawiesić Lootlog ${name}?`,
  suspendConfirmDescription:
    "Członkowie stracą dostęp w ciągu kilku sekund, a otwarte sesje dodatku odłączą się od tego Lootloga. Możesz go przywrócić w każdej chwili.",
  resumeSubmit: "Przywróć Lootlog",
  resumeConfirmTitle: (name: string) => `Przywrócić Lootlog ${name}?`,
  resumeConfirmDescription:
    "Członkowie odzyskają dostęp według ról na Discordzie.",
  inactiveNotice:
    "Bot nie jest na tym serwerze, więc Lootlog jest nieaktywny niezależnie od zawieszenia.",

  vanityHeading: "Własny adres",
  vanityDescription:
    "Usuń adres zajęty z naruszeniem zasad. Właściciel może potem ustawić nowy.",
  vanityClear: "Usuń własny adres",
  vanityClearConfirmTitle: (vanity: string) => `Usunąć adres „${vanity}”?`,
  vanityClearConfirmDescription:
    "Linki z tym adresem przestaną działać. Lootlog zostanie pod ID serwera.",

  discordHeading: "Discord",
  discordDescription:
    "Stan uprawnień bota i kanałów z ostatniej synchronizacji.",
  discordNever: "Jeszcze nie zsynchronizowano.",
  discordStatus: "Status",
  discordChannels: "Kanały",
  discordChannelsValue: (selectable: number, total: number) =>
    `${selectable} z ${total} do wyboru`,
  discordLastSuccess: "Ostatnia udana",
  discordLastAttempt: "Ostatnia próba",
  discordLastError: "Ostatni błąd",
  discordMissing: "Brakujące uprawnienia",
  discordAllPermissions: "Komplet",
  discordRefresh: "Odśwież z Discorda",
  discordCooldown:
    "Discord był odświeżany przed chwilą. Spróbuj ponownie za kilka minut.",

  notificationsHeading: "Powiadomienia",
  notificationsPending: "Oczekujące",
  notificationsFailed: "Nieudane",
  notificationsBlocked: "Zablokowane",
  notificationsLastError: "Ostatni błąd",

  rolesListHeading: "Role Lootloga",
  rolesListDescription:
    "Role pochodzą z Discorda; uprawnienia ustawia administrator Lootloga w aplikacji.",
  rolesEmpty: "Ten Lootlog nie ma ról.",
  roleName: "Rola",
  rolePermissions: "Uprawnienia",
  roleLevels: "Poziomy",
  roleMembers: "Członkowie",
  noPermissions: "Brak",
  permissionsCount: (count: number) =>
    `${count} ${permissionForms[polishPlural.select(count)] ?? "uprawnień"}`,

  membersHeading: "Członkowie",
  membersSearchPlaceholder: "Nazwa, Discord ID lub ID użytkownika",
  membersEmpty: "Brak członków.",
  memberName: "Członek",
  memberType: "Typ",
  memberStatus: "Status",
  memberJoined: "Dołączył",
  memberActive: "Aktywny",
  memberInactive: "Nieaktywny",

  organizationAuditHeading: "Historia działań",
  auditScopeUsers: "Użytkownicy",
  auditScopeOrganizations: "Lootlogi",
  auditOrganization: "Lootlog",

  userOrganizationsHeading: "Lootlogi",
  userOrganizationsEmpty: "Użytkownik nie należy do żadnego Lootloga.",
  userOrganizationsUnavailable:
    "Nie udało się wczytać Lootlogów. Pozostałe dane użytkownika są aktualne.",

  errorTitle: "Coś poszło nie tak",
  errorDescription:
    "Usługa auth albo API nie odpowiedziała poprawnie. Odśwież stronę za chwilę.",
} as const;
