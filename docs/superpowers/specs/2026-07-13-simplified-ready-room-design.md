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
- Jedna postać, identyfikowana przez `(discordId, accountId, characterId)`, może należeć do jednego aktywnego pokoju. Próba dołączenia do innego pokoju kończy się `ALREADY_JOINED_ELSEWHERE` do czasu wycofania lub usunięcia.
- Różne postacie należące do tego samego Discord ID pozostają niezależne. Druga postać organizatora może dołączyć do jego pokoju, ale dokładna postać organizująca nie może być uczestnikiem.
- Status pokoju zostaje ograniczony do `ACTIVE` i `CANCELLED`. Nie istnieje `CLOSED`; aktywny pokój kończy się przez anulowanie albo wygaśnięcie po 30 minutach.
- Kontrakt i klucze Redis przechodzą bezpośrednio na wersję v3. Nie powstaje migracja, warstwa zgodności ani odczyt v2.

## API i spójność

- Istniejące `POST /applications` zmienia semantykę na atomowe dołączenie. Operacja w jednym skrypcie Redis zapisuje uczestnika, indeksuje pokój dla Discord ID i zakłada blokadę aktywnego pokoju dla postaci.
- Powtórne dołączenie tej samej postaci do tego samego pokoju jest idempotentne. Konflikt CAS jest ponawiany maksymalnie cztery razy.
- Pozostają operacje: create, list, get, join, withdraw, remove participant, party observation i cancel.
- Zostają usunięte endpointy i DTO: accept, decline, start/respond ready-check, reserve/acknowledge/annotate/reconcile invitation oraz close.
- Zamiast rezerwacji zaproszeń powstaje niemutujące rozstrzygnięcie celów. Organizator przekazuje `participantId[]`, a API zwraca tylko nadal aktywne cele `OUTSIDE` jako `{ participantId, characterId }`.
- Rozstrzygnięcie celów weryfikuje własność pokoju i jego aktywność, ale nie zapisuje statusu, komendy, wyniku ani rewizji. Wycofany, usunięty lub będący już w grupie uczestnik zostaje pominięty.
- Projekcja organizatora zawiera wszystkich aktywnych uczestników i `ownedParticipantIds`. Projekcja uczestnika zawiera wyłącznie aktywne wpisy należące do jego Discord ID.
- Obserwacja składu grupy pozostaje informacyjna i aktualizuje wyłącznie `partyPresence`.

## Klient gry i UI

- Wiersz uczestnika organizatora pokazuje postać oraz tylko użyteczne akcje: dodanie do znajomych, `Zaproś` i `Usuń`.
- `Zaproś wszystkich` pozostaje stale renderowane. Przycisk pojedynczy, zbiorczy i hotkey korzystają ze wspólnej kolejki FIFO.
- Każdy zamiar zaproszenia przechowuje identyfikator pokoju, postać organizatora i wybrane `participantId`. Przed rozstrzygnięciem celów i przed każdym helperem klient ponownie sprawdza aktywny pokój oraz `(accountId, characterId)` organizatora.
- Po odpowiedzi API klient wywołuje `inviteCharacterToParty` najwyżej raz na zwrócony cel w ramach danego zamiaru. Nie wysyła potwierdzenia wyniku do API.
- Do czasu zaobserwowania `IN_PARTY` kolejne kliknięcia mogą ponownie zapraszać tę samą postać. Jest to zamierzone zachowanie wspierające szybkie wielokrotne naciskanie przycisku.
- Nowy uczestnik dołączony po utworzeniu wcześniejszego zamiaru nie jest do niego dopisywany; obejmie go następne kliknięcie `Zaproś wszystkich`.
- Widok uczestnika pokazuje organizatora, obecność w grupie i akcję `Wycofaj się`. Nie pokazuje akceptacji, gotowości ani wyniku zaproszenia.
- Aktywna postać wybiera swój pokój przez `(accountId, characterId)`. Ręczny selektor wielu pokoi nie jest potrzebny, ponieważ jedna postać może należeć tylko do jednego pokoju.
- Stopka organizatora zawiera tylko `Zaproś wszystkich` i `Anuluj zbiórkę`. Znikają ready-check oraz `Zamknij po zebraniu grupy`.
- Wszystkie usunięte etykiety i18n oraz nieużywane hooki i komponenty zostają skasowane zamiast zachowywania martwego interfejsu.

## Obsługa błędów

- Brak połączenia, niesynchronizowany stan, niewłaściwa postać organizatora, wygasły pokój lub brak celów blokują utworzenie zamiaru bez akcji w grze.
- Zmiana konta, postaci lub pokoju po kliknięciu unieważnia zamiar przed wykonaniem helpera.
- Błąd rozstrzygnięcia celów nie uruchamia helpera. Błąd helpera jednego celu nie zatrzymuje kolejnych celów w tej samej kolejce.
- Wycofanie i usunięcie zwalniają blokadę postaci oraz usuwają indeks pokoju dopiero wtedy, gdy Discord ID nie ma w nim innej aktywnej postaci.
- Anulowanie zwalnia indeks organizatora, indeksy uczestników i wszystkie blokady postaci, a następnie publikuje końcową projekcję do dotychczasowych odbiorców.

## Kryteria akceptacji i testy

- Dołączenie od razu umieszcza postać na liście organizatora i udostępnia akcję zaproszenia bez akceptacji.
- Ta sama postać nie dołącza równocześnie do dwóch pokoi; różne postacie jednego Discord ID mogą należeć do różnych pokoi lub tego samego pokoju.
- `Zaproś`, `Zaproś wszystkich` i hotkey wykonują akcję tylko po jawnym działaniu użytkownika, zachowują FIFO i pozwalają na kolejne szybkie próby do czasu `IN_PARTY`.
- Wycofany, usunięty lub już obecny w grupie uczestnik nie jest zwracany przez rozstrzygnięcie celów i nie otrzymuje zaproszenia ze starego zamiaru.
- Sockety, synchronizacja REST, obserwator grupy, timery i efekty React nie importują ani nie wywołują helpera gry.
- Testy API obejmują atomowe dołączenie, idempotencję, blokadę między pokojami, wiele postaci jednego Discord ID, wycofanie, usunięcie, anulowanie i rozstrzyganie celów.
- Testy klienta obejmują pojedyncze i zbiorcze zaproszenia, szybkie wielokrotne kliknięcia, zmianę kontekstu organizatora, pominięcie nieaktualnych celów oraz uproszczone widoki.
- Po zmianach przechodzą pełne testy API, gateway i game-client, buildy API/gateway/types/game-client, TypeScript web, OpenAPI/Orval, lint, formatowanie i `git diff --check`.

## Poza zakresem

- Automatyczne zaproszenia wyzwalane zgłoszeniem lub socketem.
- Ustawienie automatycznych zaproszeń per pokój.
- Historia uczestników, wyników zaproszeń i gotowości.
- Migracja danych v2 lub zgodność starych klientów.
