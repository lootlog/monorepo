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

- Dodano typy stanu pokoju, aplikacji, gotowości, zaproszeń, źródła zaproszenia i obecności w grupie.
- Dodano prywatne projekcje organizatora i uczestnika. Uczestnik nie otrzymuje danych innych kandydatów.
- Utrzymano wiele oczekujących zgłoszeń jednego użytkownika i globalną blokadę jednego zaakceptowanego pokoju.
- Rozdzielono `CLOSED` i `CANCELLED`; odbiorcy końcowej projekcji są pobierani ze stanu sprzed przejścia terminalnego.

### API i Redis

- Dodano pełne REST API do tworzenia, listowania i pobierania Ready Room oraz do obsługi zgłoszeń, akceptacji, odrzucenia, usunięcia i wycofania.
- Dodano rundy sprawdzania gotowości wraz z odpowiedziami uczestników.
- Dodano kompletne obserwacje składu grupy, w tym pustą grupę.
- Dodano jawne zamknięcie i anulowanie zbiórki.
- Dodano dwufazowe zaproszenia: rezerwację identyfikatorów komend, osobne potwierdzenie każdego celu i idempotencję po `commandId`.
- Dodano ręczne oznaczenie zaproszenia oraz jawne rozstrzygnięcie wygasłego `UNKNOWN` jako `SENT`, `FAILED` albo `NOT_MARKED`.
- Dodano jawny retry tworzący nowy `commandId`; serwer nigdy sam nie ponawia akcji gry.
- Dodano atomowe operacje Redis/Lua, indeks organizatora, indeksy oczekujących i zaakceptowanego pokoju, stały TTL oraz 60-sekundowy tombstone stanu terminalnego.
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

- Zastąpiono persystowany lokalny stan zbiórki magazynem projekcji indeksowanych po `notificationId`.
- Merge REST/socket przyjmuje tylko nowszą rewizję agregatu.
- Dodano synchronizację początkową, aktualizacje socketowe, usuwanie wygasłych pokoi i selektor wielu oczekujących zgłoszeń.
- Dodano widok organizatora i uczestnika, listę kandydatów, status aplikacji, gotowości, zaproszenia i obecności w grupie.
- Dodano akceptację, odrzucenie, usunięcie, wycofanie, rundę gotowości, ręczne statusy zaproszeń, zamknięcie i anulowanie.
- `Zaproś wszystkich` pozostało dostępne. Najpierw rezerwuje niezależne komendy na serwerze, następnie po jawnym działaniu użytkownika wywołuje helper dokładnie raz na cel i osobno potwierdza wynik.
- Brak potwierdzenia nie ustawia automatycznie `FAILED`. Po terminie UI lokalnie wyświetla `UNKNOWN`, bez mutowania snapshotu i bez automatycznego retry.
- Hotkey `invite-all` używa tego samego dwufazowego przepływu co przycisk.
- Obserwator grupy wysyła wyłącznie znormalizowany snapshot identyfikatorów postaci, począwszy od pełnego pustego snapshotu; nie wykonuje żadnej akcji w grze.
- Zbiórki z formularza, detektora NPC, powiadomień oraz kart czatu trafiają do Ready Room.
- Usunięto wcześniejsze ciche anulowanie przed utworzeniem kolejnej zbiórki oraz lokalny pięciosekundowy timeout zaproszeń.
- Wszystkie nowe teksty interfejsu korzystają z i18n, a komponenty zachowują zasadę jednego komponentu na plik.

## Weryfikacja

Wykonane i zakończone powodzeniem:

- API: 92 pliki testowe, 936 testów.
- Gateway: 17 plików testowych, 189 testów.
- Game client: 143 pliki testowe, 656 testów.
- Produkcyjny build game-client (`tsc`, Vite i kopiowanie entrypointu).
- TypeScript web (`tsc --noEmit`).
- Generowanie i kontrola OpenAPI oraz klientów Orval.
- Lint i formatowanie plików objętych zmianą; hooki pre-commit przeszły.
- Audyt wyszukiwania potwierdził brak starych `silentCancel`, lokalnych `inviteStates` oraz wygenerowanych endpointów starego create/cancel.
- Audyt wywołań `inviteCharacterToParty` potwierdził, że nowy Party Finder używa go tylko w hooku uruchamianym przez jawny przycisk/hotkey. Sockety, obserwatory, timery i efekty go nie importują.

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
