# Flow synchronizacji dostępu z Discordem

Ten dokument opisuje, kiedy Lootlog ufa danym z Discorda, kiedy używa lokalnej bazy danych i kiedy odbiera dostęp do serwera.

## Najważniejsza zasada

Nieudany request do Discorda nie oznacza, że użytkownik wyszedł z serwera.

Jeśli Discord zwróci błąd techniczny, rate limit, timeout albo chwilową niedostępność, Lootlog nie deaktywuje membera. W takim przypadku zapisuje tylko informację o próbie odświeżenia i korzysta z ostatniego poprawnego stanu przez ograniczony czas.

Dostęp jest odbierany tylko wtedy, gdy mamy jasny sygnał:

- Discord potwierdził, że member nie istnieje na serwerze (`404`).
- Token użytkownika jest nieważny albo konto Discord nie może być użyte (`401`).
- Udało się pobrać pełną listę serwerów użytkownika i konkretnego serwera nie ma na tej liście.
- Administrator ręcznie dezaktywował membera albo serwer został dezaktywowany.

## Lista serwerów użytkownika

Endpoint `/users/@me/guilds` pobiera aktualną listę serwerów z Discorda i filtruje ją do serwerów istniejących w Lootlogu.

Flow:

1. API pyta Discorda o serwery użytkownika.
2. Zapytanie jest chronione lokalnym single-flightem w instancji API oraz krótkim distributed single-flightem przez Redis/Redlock, żeby 24 instancje nie odpaliły tego samego pełnego fetcha równolegle.
3. Jeśli Discord zwróci `429`, timeout albo chwilowy błąd `5xx`, endpoint `/users/@me/guilds` może zwrócić stale lokalne podsumowanie dostępu i nie zmienia memberów w bazie.
4. Jeśli Discord zwróci błąd autoryzacji, API zwraca błąd do klienta i nie maskuje go lokalnym fallbackiem.
5. Jeśli Discord zwróci listę, ta lista jest traktowana jako świeża prawda.
6. Serwery z listy Discorda są filtrowane do aktywnych serwerów w Lootlogu.
7. Aktywne membery użytkownika w serwerach, których nie ma już na liście Discorda, są deaktywowane.

To znaczy, że pusty wynik z Discorda ma znaczenie tylko wtedy, gdy request naprawdę się udał. Pusty wynik wynikający z błędu, rate limitu albo timeoutu nie jest maskowany jako `[]` i nie odpala deaktywacji.

Endpoint `/users/@me/guilds/accessible` jest DB-only. Nie pyta Discorda o listę serwerów. Jest szybki i może działać na cache, ale może być chwilowo nieaktualny. Jeśli znajdzie stale membery, kolejkuje ich odświeżenie w tle.

## Sprawdzanie permisji na serwerze

Guard permisji korzysta z danych membera dla konkretnego serwera.

Flow:

1. Guard próbuje pobrać kontekst permisji z Redis cache.
2. Cache jest używany tylko wtedy, gdy zawiera aktywnego membera z nadal świeżym `lastDiscordSyncAt`.
3. Jeśli cache jest nieaktualny, guard pobiera membera przez `MembersService`.
4. Jeśli lokalny member jest świeży, decyzja jest podejmowana z DB.
5. Jeśli lokalny member jest stale, API próbuje odświeżyć go z Discorda, o ile rate limiter na to pozwala.
6. Jeśli Discord potwierdzi membera, role i czas synchronizacji są aktualizowane.
7. Jeśli Discord zwróci `404`, member jest dezaktywowany i dostęp jest blokowany.
8. Jeśli Discord zwróci `401`, member jest dezaktywowany, a request powinien wymusić ponowne logowanie.
9. Jeśli Discord zwróci rate limit albo błąd techniczny, member nie jest deaktywowany.

Przy rate limitach i błędach technicznych Lootlog może użyć ostatniego poprawnego stanu membera tylko przez 6 godzin od ostatniego udanego synca. Po tym czasie request dostaje tymczasowe `DISCORD_MEMBER_VERIFICATION_UNAVAILABLE` zamiast stale membera, do momentu aż Discord znowu potwierdzi membera.

## Znaczenie timestampów

`lastDiscordAttemptAt` oznacza, że próbowaliśmy zapytać Discorda.

`lastDiscordSyncAt` oznacza, że Discord dał odpowiedź, której można użyć jako źródła prawdy. Nie jest aktualizowany przy rate limitach, timeoutach ani błędach technicznych.

`401` deaktywuje membera, ale nie oznacza udanego potwierdzenia membershipu, więc nie musi przesuwać `lastDiscordSyncAt`.

Dlatego failed refresh ani błąd autoryzacji nie daje fałszywego wrażenia, że dane są świeże.

## Co się dzieje po deaktywacji

Gdy member zostaje dezaktywowany:

1. `active` zmienia się na `false`.
2. Role membera są czyszczone.
3. Cache permisji jest usuwany.
4. Cache konfiguracji użytkownika dla lootloga jest usuwany.
5. Gateway dostaje event usunięcia membera, żeby odświeżyć widok i połączenia użytkownika.

Efekt dla użytkownika jest taki, że serwer znika z dostępnych serwerów, a bezpośrednie wejście na serwer zostaje zablokowane.

## Dlaczego nie deaktywujemy na każdy błąd

Discord może zwrócić więcej statusów niż tylko `401` i `404`, na przykład `403`, `429`, `5xx` albo błąd sieciowy. Taki status nie zawsze oznacza, że użytkownik wyszedł z serwera.

Lootlog traktuje więc błędy tak:

- `404` dla membera: użytkownik nie jest już memberem tego serwera.
- `401`: token użytkownika jest nieważny i dostęp nie może być dalej zaufany.
- `429`: Discord rate-limituje, więc próbujemy ponownie później.
- `5xx`, timeout, błąd sieciowy: Discord nie potwierdził żadnej zmiany dostępu.
- Inne statusy HTTP: zapisujemy status próby, ale nie odbieramy dostępu automatycznie.

## Diagnostyka

Lootlog zapisuje lekkie metryki w Redisie i strukturalne logi dla:

- requestów Discorda kończących się `401`, `403` albo `429` na endpointach `guilds` i `guild-member`;
- wyników kolejki odświeżania memberów: `queued`, `delayed`, `rate_limited`, `processed`, `failed`;
- użycia stale membera i przypadków `DISCORD_MEMBER_VERIFICATION_UNAVAILABLE`;
- opóźnienia przetwarzania jobów odświeżania memberów.

Te metryki nie są globalnym rate limiterem. Służą tylko do obserwacji, czy użytkownicy wpadają w fallbacki i czy kolejka nadąża z odświeżaniem.
