# Party Finder Ready Room — zapis implementacji

Data zakończenia: 2026-07-13  
Branch: `feature/lootlog-gameplay-coordination`

## Wynik

Plan z `/Users/kamil/Desktop/lootlog-feature-research.md` został wdrożony jako efemeryczny Party Finder Ready Room obejmujący współdzielone kontrakty, API, Redis, RabbitMQ, gateway i klienta gry. Ready Room jest jedynym właścicielem stanu zbiórki. Nie zapisuje trwałej historii i wygasa po stałych 30 minutach.

Lootlog nie wykonuje automatycznych akcji w grze. Obserwatory, sockety, timery, synchronizacja REST, zmiany gotowości i zdarzenia grupy jedynie aktualizują stan informacyjny. Wywołania helperów gry pozostały wyłącznie w jawnych akcjach użytkownika:

- pojedyncze zaproszenie do grupy po kliknięciu;
- `Zaproś wszystkich` po kliknięciu albo użyciu skonfigurowanego hotkeya;
- dodanie do znajomych po kliknięciu;
- istniejące jawne akcje w czacie i na liście graczy online.

## Zaimplementowany zakres

### Kontrakty i model domenowy

- Dodano kontrakt Ready Room w wersji `schemaVersion: 2`, obejmujący stan pokoju, aplikacji, gotowości, zaproszeń, źródła zaproszenia i obecności w grupie.
- Każde zgłoszenie ma stabilny `participantId` oraz rosnący `applicationVersion`. Komendy dotyczą konkretnego zgłoszenia, a nie całego konta Discord.
- Dodano prywatne projekcje organizatora i uczestnika. Organizator widzi wszystkich kandydatów i własne `ownedParticipantIds`; uczestnik otrzymuje wyłącznie wpisy należące do jego Discord ID, bez danych obcych kandydatów.
- Jedno Discord ID może zgłosić wiele różnych postaci, również drugą postać do pokoju organizowanego przez pierwszą. Dokładnie ta sama postać organizująca nie może zostać dodana jako uczestnik, a jedna postać nie może być zaakceptowana równocześnie w wielu pokojach.
- Ponowne zgłoszenie po odrzuceniu albo wycofaniu zachowuje `participantId`, zwiększa `applicationVersion` i unieważnia komendy dotyczące poprzedniej wersji.
- Rozdzielono `CLOSED` i `CANCELLED`; odbiorcy końcowej projekcji są pobierani ze stanu sprzed przejścia terminalnego.

### API i Redis

- Dodano pełne REST API do tworzenia, listowania i pobierania Ready Room oraz do obsługi zgłoszeń, akceptacji, odrzucenia, usunięcia i wycofania.
- Dodano rundy sprawdzania gotowości wraz z odpowiedziami uczestników.
- Dodano kompletne obserwacje składu grupy, w tym pustą grupę.
- Dodano jawne zamknięcie i anulowanie zbiórki.
- Dodano dwufazowe zaproszenia: semantyczną rezerwację identyfikatorów komend, osobne potwierdzenie każdego celu i idempotencję po `commandId`.
- Rezerwacja wiąże komendę z `participantId` i `applicationVersion`, serializuje konflikty maksymalnie czterema próbami CAS i jawnie zastępuje poprzednią rezerwację. Spóźnione potwierdzenie starej wersji nie może nadpisać nowej aplikacji.
- Dodano ręczne oznaczenie zaproszenia oraz jawne rozstrzygnięcie wygasłego `UNKNOWN` jako `SENT`, `FAILED` albo `NOT_MARKED`.
- Dodano jawny retry tworzący nowy `commandId`; serwer nigdy sam nie ponawia akcji gry.
- Dodano atomowe operacje Redis/Lua, prefiksy kluczy v2, indeks organizatora, indeks pokoi per Discord ID, blokady zaakceptowanego pokoju per `(discordId, accountId, characterId)`, stały TTL oraz 60-sekundowy tombstone stanu terminalnego.
- Indeks użytkownika pozostaje aktywny tak długo, jak istnieje choć jedno jego aktywne zgłoszenie; listowanie usuwa duplikaty projekcji.
- Operacje lokalne uczestnika i potwierdzenia zaproszeń używają maksymalnie czterech prób CAS. Po wyczerpaniu zwracany jest `REVISION_CONFLICT`.
- Próba utworzenia kolejnej aktywnej zbiórki zwraca `ACTIVE_GATHERING_EXISTS`; poprzedni pokój nie jest po cichu anulowany.
- Zbiórki rozpoczynane z detektora NPC tworzą ten sam Ready Room z tym samym `notificationId`. Snapshot organizatora jest wymagany w takim żądaniu.
- Stary, równoległy mechanizm właścicielski zbiórek został usunięty z `MessagingService`. Zwykłe powiadomienia NPC i ich dotychczasowy kanał ochotników pozostały osobnym przepływem.
- Zaktualizowano OpenAPI i wygenerowano klientów dla game-client oraz web.

### Publikacja i gateway

- API publikuje pełną, spersonalizowaną projekcję po udanym commicie; błąd publikacji nie cofa stanu Redis.
- Dodano routing key `users.party-ready-room.updated`.
- Gateway dołącza użytkownika do prywatnych pokoi `user:<discordId>:guild:<guildId>` i kieruje projekcję tylko do wskazanego odbiorcy w uprawnionej gildii.
- Dodano walidację koperty, retry, DLQ i testy prywatności routingu.

### Game client

- Zastąpiono persystowany lokalny stan zbiórki magazynem projekcji v2 indeksowanych po `notificationId`.
- Merge REST/socket nie cofa rewizji ani nie zastępuje projekcji organizatora równorzędną projekcją uczestnika. Synchronizacja autorytatywna usuwa tylko pokoje niezmienione od jej rozpoczęcia, dzięki czemu nowszy event socketowy nie może zostać przypadkowo skasowany.
- Dodano synchronizację początkową, aktualizacje socketowe, usuwanie wygasłych pokoi i selektory wpisów po `accountId + characterId`.
- Bieżąca druga postać wybiera własny zaakceptowany pokój nawet wtedy, gdy to samo Discord ID organizuje inny pokój. Panel organizatora ma pierwszeństwo tylko na faktycznej postaci organizującej.
- Dodano widok organizatora i uczestnika, listę kandydatów, status aplikacji, gotowości, zaproszenia i obecności w grupie.
- Widok organizatora pokazuje również status własnej drugiej postaci i pozwala jej odpowiedzieć na gotowość albo wycofać własne zgłoszenie.
- Dodano akceptację, odrzucenie, usunięcie, wycofanie, rundę gotowości, ręczne statusy zaproszeń, zamknięcie i anulowanie.
- `Zaproś wszystkich` jest stale renderowane i można je szybko naciskać wielokrotnie. Kolejne kliknięcia i hotkeye trafiają do wspólnej kolejki FIFO; serwer rezerwuje tylko nadal poprawne cele, więc później zaakceptowani gracze mogą zostać objęci kolejnym kliknięciem.
- Przycisk zbiorczy, przyciski pojedynczych graczy i hotkey `invite-all` używają tego samego koordynatora. Helper gry jest serializowany i uruchamiany najwyżej raz dla każdej skutecznej rezerwacji.
- Przed rezerwacją oraz przed każdym wywołaniem helpera ponownie sprawdzana jest tożsamość postaci organizującej. Zmiana konta, postaci albo kontekstu zbiórki zatrzymuje akcję; klient nie zaprasza w imieniu niewłaściwej postaci.
- Potwierdzenie wyniku jest niezależne od wywołania helpera i ma łącznie trzy próby z tym samym `commandId`. Retry potwierdzenia nigdy nie powtarza akcji w grze, a `STALE_COMMAND` jest stanem terminalnym.
- `Zamknij po zebraniu grupy` jest jawnym kliknięciem kończącym Ready Room jako `CLOSED`. Nie wykonuje akcji w grze i nie jest uruchamiane automatycznie przez skład grupy.
- Obserwator grupy wysyła wyłącznie znormalizowany snapshot identyfikatorów postaci, począwszy od pełnego pustego snapshotu; nie wykonuje żadnej akcji w grze.
- Zbiórki z formularza, detektora NPC, powiadomień oraz kart czatu trafiają do Ready Room.
- Usunięto wcześniejsze ciche anulowanie przed utworzeniem kolejnej zbiórki oraz lokalny pięciosekundowy timeout zaproszeń.
- Wszystkie nowe teksty interfejsu korzystają z i18n, a komponenty zachowują zasadę jednego komponentu na plik.

## Weryfikacja

Wykonane i zakończone powodzeniem:

- API: 92 pliki testowe, 947 testów.
- Gateway: 17 plików testowych, 189 testów.
- Game client: 143 pliki testowe, 668 testów.
- Skoncentrowane testy Ready Room API: 5 plików, 35 testów.
- Skoncentrowany test regresji wyboru pokoju aktywnej postaci: 6 testów magazynu Party Finder.
- Produkcyjne buildy API, gateway i `@lootlog/types`.
- Produkcyjny build game-client (`tsc`, Vite i kopiowanie entrypointu).
- TypeScript web (`tsc -b --pretty false`).
- Generowanie i kontrola OpenAPI oraz klientów Orval.
- Pełna kontrola formatowania 2696 plików, `git diff --check`, lint objętych zmianą i hooki pre-commit.
- Audyt wyszukiwania potwierdził brak starych `silentCancel`, lokalnych `inviteStates` oraz wygenerowanych endpointów starego create/cancel.
- Audyt wywołań `inviteCharacterToParty` potwierdził, że nowy Party Finder używa go tylko we współdzielonym koordynatorze uruchamianym przez jawny przycisk/hotkey. Sockety, obserwatory, timery i efekty go nie importują ani nie wywołują.

Znane, niezwiązane ostrzeżenia builda pozostają bez zmian: istniejąca pseudoklasa CSS `.all:b` oraz ścieżki kursora rozwiązywane w runtime.

## Granice weryfikacji

- Skrypty i adapter Redis zostały pokryte testami granic repozytorium, ale nie wykonano osobnego testu integracyjnego z zewnętrzną, uruchomioną instancją Redis.
- Zgodnie z instrukcją repozytorium aplikacja nie była uruchamiana. Interfejs przeszedł testy komponentów, TypeScript i build produkcyjny, bez dodatkowego ręcznego smoke testu w działającej grze.

## Commity implementacji

- `76e80b929` — kontrakty projekcji Ready Room.
- `63744ea77` — tworzenie i zgłoszenia.
- `425e82ca0` — lifecycle, Redis i koordynacja.
- `a330c3a03` — kontroler HTTP.
- `a52208bb5` — prywatny routing gatewaya.
- `0d56351c4` — kompletny kontrakt API, NPC, zaproszenia i wygenerowane klienty.
- `4325c4d83` — walidacja celu ręcznej mutacji zaproszenia.
- `35d84801d` — przepływ Ready Room i UI w game-client.
- `b15b85e85` — specyfikacja wielu postaci jednego użytkownika i kolejki zaproszeń.
- `2303965b9` — plan implementacji kontraktu v2.
- `07c1a64f5` — Ready Room v2, wielopostaciowość i koordynator jawnych zaproszeń.
- `ce20a92df` — priorytet pokoju aktywnej postaci nad pokojem organizowanym przez inne konto tej samej osoby.
