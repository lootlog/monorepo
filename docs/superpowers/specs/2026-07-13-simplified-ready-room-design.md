# Uproszczony Ready Room — specyfikacja

Data: 2026-07-13  
Branch: `feature/lootlog-gameplay-coordination`

## Cel

Ready Room ma maksymalnie skrócić drogę od zgłoszenia gracza do zaproszenia go do grupy. Przepływ zostaje uproszczony do:

1. gracz dołącza do zbiórki;
2. organizator klika `Zaproś` albo `Zaproś wszystkich`;
3. klient organizatora wysyła zaproszenie w grze.

Lootlog nigdy nie wykonuje akcji w grze w odpowiedzi na socket, timer, synchronizację ani zmianę stanu. Każde zaproszenie wymaga jawnego kliknięcia lub hotkeya użytkownika.

## Model domenowy

- Zgłoszenie natychmiast tworzy aktywnego uczestnika. Nie istnieją stany `APPLIED`, `ACCEPTED`, `DECLINED`, gotowość ani status zaproszenia.
- `PartyReadyRoomParticipant` zawiera wyłącznie `participantId`, właściciela Discord, snapshot postaci, `partyPresence` oraz znaczniki czasu.
- Agregat przechowuje tylko aktywnych uczestników. Wycofanie przez uczestnika lub usunięcie przez organizatora usuwa wpis; ponowne dołączenie tworzy nowy `participantId`.
- Jedna postać w grze, identyfikowana globalnie przez `(world, characterId)`, może zajmować jeden aktywny pokój jako organizator albo uczestnik. Próba utworzenia lub dołączenia do innego pokoju kończy się `ALREADY_JOINED_ELSEWHERE` do czasu zwolnienia blokady.
- Różne postacie należące do tego samego Discord ID pozostają niezależne. Druga postać organizatora może dołączyć do jego pokoju, ale dokładna postać organizująca nie może być uczestnikiem.
- W obrębie pokoju `characterId` jest unikalny niezależnie od deklarowanego Discord ID lub `accountId`. Powtórna operacja jest idempotentna tylko dla tego samego właściciela i tej samej postaci; sprzeczny właściciel otrzymuje `CHARACTER_ALREADY_JOINED`.
- Status agregatu zostaje ograniczony do `ACTIVE` i `CANCELLED`. Nie istnieje `CLOSED`; aktywny pokój kończy się przez anulowanie albo wygaśnięcie po 30 minutach. `CANCELLED` istnieje wyłącznie jako krótki terminalny tombstone serwera i nie jest publikowany jako projekcja.
- Agregat, projekcje i koperty używają wyłącznie `schemaVersion: 3`, a Redis wyłącznie prefiksów `party-ready-room:v3:*`. Nie powstaje migracja, warstwa zgodności ani odczyt v2; stare klucze v2 są ignorowane i wygasają z własnym TTL.

## API i spójność

- Create w jednym skrypcie Redis zapisuje pokój, indeks organizatora i blokadę `(world, organizerCharacter.characterId)`. Jeżeli postać organizująca jest już uczestnikiem albo organizatorem innego aktywnego pokoju, utworzenie zostaje odrzucone jako `ALREADY_JOINED_ELSEWHERE`.
- Istniejące `POST /applications` zmienia semantykę na atomowe dołączenie. Operacja w jednym skrypcie Redis zapisuje uczestnika, indeksuje pokój dla Discord ID i zakłada blokadę `(world, characterId)`.
- Powtórne dołączenie tej samej postaci do tego samego pokoju jest idempotentne. Konflikt CAS jest ponawiany maksymalnie cztery razy.
- Blokady postaci organizującej i uczestników, indeks organizatora oraz indeks użytkownika mają TTL nie dłuższy niż pozostały czas pokoju. Create/join usuwają blokadę wskazującą brakujący albo wygasły pokój przed oceną konfliktu; listowanie usuwa wygasłe wyniki i wpisy wskazujące brakujące pokoje.
- Pozostają operacje: create, list, get, join, withdraw, remove participant, party observation i cancel.
- Zostają usunięte endpointy i DTO: accept, decline, start/respond ready-check, reserve/acknowledge/annotate/reconcile invitation oraz close.
- Zamiast rezerwacji zaproszeń powstaje niemutujące rozstrzygnięcie celów. Organizator przekazuje maksymalnie 100 `participantId`, a API zwraca tylko nadal aktywne cele `OUTSIDE` jako `{ participantId, characterId }`.
- Rozstrzygnięcie celów deduplikuje wejście i wyjście po `participantId` oraz `characterId`, weryfikuje własność pokoju i jego aktywność, ale nie zapisuje statusu, komendy, wyniku ani rewizji. Wycofany, usunięty lub będący już w grupie uczestnik zostaje pominięty.
- Projekcja organizatora zawiera wszystkich aktywnych uczestników i `ownedParticipantIds`. Projekcja uczestnika zawiera wyłącznie aktywne wpisy należące do jego Discord ID.
- Koperta aktualizacji jest dyskryminowaną unią `UPSERT` z projekcją v3 oraz `REMOVE` z `schemaVersion: 3`, `notificationId` i monotoniczną `revision` pokoju. Klient odrzuca wszystkie koperty/projekcje inne niż v3.
- Magazyn klienta pamięta najwyższą rewizję każdego pokoju również po jego usunięciu. Zarówno `UPSERT`, jak i `REMOVE` są stosowane tylko wtedy, gdy nie są starsze od zapamiętanej rewizji; przy tej samej rewizji `REMOVE` ma pierwszeństwo. Opóźniony event wycofania nie może usunąć nowszego ponownego dołączenia.
- Przed wycofaniem, usunięciem i anulowaniem serwis zachowuje listę dotychczasowych odbiorców. Aktywny organizator zawsze otrzymuje `UPSERT`, nawet gdy wycofał swoją ostatnią alternatywną postać. Nieorganizator tracący ostatnią własną postać otrzymuje `REMOVE`; jeśli ma inną aktywną postać, otrzymuje nową projekcję.
- Anulowanie zapisuje `CANCELLED` z nową rewizją jako 60-sekundowy tombstone, zwalnia blokadę postaci organizującej, blokady uczestników i indeksy oraz wysyła wyłącznie `REMOVE` z terminalną rewizją do organizatora i wszystkich dotychczasowych uczestników. Nie publikuje końcowej projekcji.
- Autorytatywna synchronizacja REST usuwa lokalne projekcje v2 i nieobecne projekcje v3 z zachowaniem ochrony przed nowszym eventem socketowym. Naturalne wygaśnięcie jest usuwane przez istniejący timer klienta oraz kolejną synchronizację/listowanie.
- Obserwacja składu grupy pozostaje informacyjna i aktualizuje wyłącznie `partyPresence`. DTO zawiera pełny snapshot identyfikatorów postaci, również pusty, oraz `(organizerAccountId, organizerCharacterId)` zgodne ze snapshotem organizatora. Każdy aktywny uczestnik obecny w snapshotcie przechodzi na `IN_PARTY`, a każdy nieobecny na `OUTSIDE`; pusty snapshot ustawia wszystkich na `OUTSIDE`.
- Tylko klient działający na dokładnej postaci organizującej, po połączeniu, dołączeniu socketu i synchronizacji Ready Room, wysyła obserwację. API wymaga Discord ID organizatora oraz zgodności przekazanej tożsamości z agregatem. Wiele sesji tej samej postaci korzysta z CAS; ostatni skutecznie zatwierdzony pełny snapshot jest autorytatywny.
- Zachowane zostają obecne reguły dostępu. Create filtruje gildie według wymaganych uprawnień organizatora. List/get zwracają pokój wyłącznie aktywnemu organizatorowi albo właścicielowi aktywnego wpisu, który nadal dzieli z pokojem dostępną gildię. Join wymaga dostępnej wspólnej gildii, zgodnego świata i zakresu poziomów. Withdraw wymaga własności wpisu; remove, observation, target resolution i cancel wymagają własności pokoju przez organizatora.

## Klient gry i UI

- Wiersz uczestnika organizatora pokazuje postać oraz tylko użyteczne akcje: dodanie do znajomych, `Zaproś` i `Usuń`.
- `Zaproś wszystkich` pozostaje stale renderowane. Przycisk pojedynczy, zbiorczy i hotkey korzystają ze wspólnej kolejki FIFO.
- Każdy zamiar zaproszenia przechowuje identyfikator pokoju, postać organizatora i wybrane `participantId`. Przed rozstrzygnięciem celów i przed każdym helperem klient ponownie sprawdza aktywny pokój oraz `(accountId, characterId)` organizatora.
- Po odpowiedzi API klient wywołuje `inviteCharacterToParty` najwyżej raz na zwrócony cel w ramach danego zamiaru. Nie wysyła potwierdzenia wyniku do API.
- Odpowiedź API jest granicą autorytatywnego sprawdzenia serwerowego. Tuż przed każdym helperem klient dodatkowo sprawdza najnowszą lokalną projekcję i lokalny skład grupy; nie istnieje atomowa gwarancja między tym ostatnim sprawdzeniem a komendą gry.
- Do czasu zaobserwowania `IN_PARTY` kolejne kliknięcia mogą ponownie zapraszać tę samą postać. Jest to zamierzone zachowanie wspierające szybkie wielokrotne naciskanie przycisku.
- Nowy uczestnik dołączony po utworzeniu wcześniejszego zamiaru nie jest do niego dopisywany; obejmie go następne kliknięcie `Zaproś wszystkich`.
- Widok uczestnika pokazuje organizatora, obecność w grupie i akcję `Wycofaj się`. Nie pokazuje akceptacji, gotowości ani wyniku zaproszenia.
- Tryb UI wynika z aktywnej postaci, nie wyłącznie z rodzaju projekcji. Dokładna postać organizująca widzi panel organizatora; druga postać tego samego Discord ID widzi własny status uczestnika i `Wycofaj się`, nawet gdy technicznie otrzymała bogatszą projekcję organizatora.
- Aktywna postać wybiera swój pokój przez `(accountId, characterId)`. Ręczny selektor wielu pokoi nie jest potrzebny, ponieważ jedna postać może należeć tylko do jednego pokoju.
- Stopka organizatora zawiera tylko `Zaproś wszystkich` i `Anuluj zbiórkę`. Znikają ready-check oraz `Zamknij po zebraniu grupy`.
- Wszystkie usunięte etykiety i18n oraz nieużywane hooki i komponenty zostają skasowane zamiast zachowywania martwego interfejsu.
- `Dodaj do znajomych` pozostaje osobną akcją gry dostępną wyłącznie przez dedykowane kliknięcie użytkownika; żaden socket, observer ani efekt nie może jej wywołać.

## Obsługa błędów

- Brak połączenia, niesynchronizowany stan, niewłaściwa postać organizatora, wygasły pokój lub brak celów blokują utworzenie zamiaru bez akcji w grze.
- Zmiana konta, postaci lub pokoju po kliknięciu unieważnia zamiar przed wykonaniem helpera.
- Błąd rozstrzygnięcia celów nie uruchamia helpera dla danego zamiaru, ale kolejka FIFO przechodzi do następnego niezależnie przechwyconego kliknięcia. Błąd helpera jednego celu nie zatrzymuje kolejnych celów w tym samym zamiarze.
- Wycofanie i usunięcie zwalniają blokadę postaci oraz usuwają indeks pokoju dopiero wtedy, gdy Discord ID nie ma w nim innej aktywnej postaci.
- Anulowanie zwalnia indeks organizatora, indeksy uczestników i wszystkie blokady postaci, a następnie publikuje terminalne koperty `REMOVE` do dotychczasowych odbiorców.

## Kryteria akceptacji i testy

- Dołączenie od razu umieszcza postać na liście organizatora i udostępnia akcję zaproszenia bez akceptacji.
- Ta sama postać nie dołącza równocześnie do dwóch pokoi; różne postacie jednego Discord ID mogą należeć do różnych pokoi lub tego samego pokoju.
- `Zaproś`, `Zaproś wszystkich` i hotkey wykonują akcję tylko po jawnym działaniu użytkownika, zachowują FIFO i pozwalają na kolejne szybkie próby do czasu `IN_PARTY`.
- Wycofany, usunięty lub już obecny w grupie uczestnik nie jest zwracany przez rozstrzygnięcie celów. Jeżeli zmiana dotrze do klienta przed ostatnim lokalnym sprawdzeniem, helper również zostaje pominięty; testy nie zakładają niemożliwej atomowości z zewnętrzną komendą gry.
- Sockety, synchronizacja REST, obserwator grupy, timery i efekty React nie importują ani nie wywołują helpera gry.
- Helper dodania znajomego jest osiągalny wyłącznie z dedykowanego handlera kliknięcia.
- Testy API obejmują atomowe dołączenie, idempotencję, blokadę między pokojami, blokadę postaci organizującej, create postacią zajętą w innym pokoju, unikalność postaci niezależnie od właściciela, wiele postaci jednego Discord ID, wycofanie, usunięcie, anulowanie i rozstrzyganie celów.
- Testy API/Redis obejmują również wygasłe blokady i indeksy, deduplikację celów oraz koperty `REMOVE` po ostatnim wpisie użytkownika i anulowaniu.
- Walidacja rozstrzygania celów odrzuca listę powyżej 100 identyfikatorów bez zwracania celów i bez możliwości uruchomienia helpera.
- Testy API obejmują pełne i puste obserwacje grupy, odrzucenie obserwacji innej postaci oraz reguły widoczności list/get.
- Testy klienta obejmują pojedyncze i zbiorcze zaproszenia, szybkie wielokrotne kliknięcia, kontynuację FIFO po błędzie, zmianę kontekstu organizatora, pominięcie celów nieaktualnych przed helperem, czyszczenie v2/v3, zdarzenia `UPSERT`/`REMOVE` poza kolejnością, wycofanie i ponowne dołączenie oraz uproszczone widoki organizatora i jego drugiej postaci.
- Po zmianach przechodzą pełne testy API, gateway i game-client, buildy API/gateway/types/game-client, TypeScript web, OpenAPI/Orval, lint, formatowanie i `git diff --check`.

## Poza zakresem

- Automatyczne zaproszenia wyzwalane zgłoszeniem lub socketem.
- Ustawienie automatycznych zaproszeń per pokój.
- Historia uczestników, wyników zaproszeń i gotowości.
- Migracja danych v2 lub zgodność starych klientów.
