# Uproszczony Ready Room v3 — plan implementacji

Specyfikacja: `docs/superpowers/specs/2026-07-13-simplified-ready-room-design.md`  
Branch: `feature/lootlog-gameplay-coordination`

## 1. Kontrakty współdzielone

- Zastąpić kontrakt Ready Room wersją `schemaVersion: 3`.
- Uprościć uczestnika do `participantId`, `discordId`, snapshotu postaci, `partyPresence`, `createdAt` i `updatedAt`.
- Usunąć typy aplikacji, gotowości, zaproszenia, ready-check, batch/command oraz `CLOSED`.
- Dodać `PartyReadyRoomClientUpdate`:
  - `UPSERT { schemaVersion: 3, projection }`;
  - `REMOVE { schemaVersion: 3, notificationId, revision }`.
- Zmienić prywatną kopertę publikacji tak, aby zawierała odbiorcę, gildie i `update`.
- Dodać typy request/response rozstrzygnięcia celów; target zawiera tylko `participantId` i `characterId`.
- Zastąpić błędy akceptacji błędami `ALREADY_JOINED_ELSEWHERE` i `CHARACTER_ALREADY_JOINED`.

## 2. API, repozytorium i Redis

- Przepisać tworzenie oraz join na atomowe operacje v3:
  - klucze `party-ready-room:v3:*`;
  - blokada postaci `(world, characterId)` dla organizatora i uczestników;
  - idempotentny join tego samego właściciela do tego samego pokoju;
  - konflikt dla zajętej postaci lub sprzecznego właściciela;
  - TTL wszystkich indeksów i blokad równy pozostałemu TTL pokoju.
- Zastąpić `saveApplication`/`accept` jedną operacją `join`; usunąć skrypt akceptacji i jego accepted-lock.
- Wycofanie i usunięcie mają kasować uczestnika, zwalniać blokadę postaci oraz usuwać indeks użytkownika tylko po zniknięciu jego ostatniej postaci w pokoju.
- Anulowanie ma zapisać 60-sekundowy tombstone `CANCELLED`, zwolnić blokadę organizatora, wszystkie blokady uczestników i indeksy.
- Zachować maksymalnie cztery próby CAS dla join, withdraw, observation i innych semantycznych mutacji.
- Usunąć serwisowe metody accept/decline, ready-check, reservation/ack/annotation/reconciliation i close.
- Dodać niemutujące `resolveInvitationTargets`: maksymalnie 100 wejściowych ID, deduplikacja po `participantId` i `characterId`, tylko aktywne cele `OUTSIDE`.
- Obserwacja grupy przyjmuje pełny snapshot oraz tożsamość organizatora; ustawia każdy aktywny wpis na `IN_PARTY` albo `OUTSIDE`.
- Zachować istniejące reguły gildii, uprawnień, świata, poziomu, własności pokoju i własności uczestnika.

## 3. Projekcje, publikacja i HTTP

- Projekcje v3 mają zawierać wyłącznie aktywne wpisy; organizator otrzymuje pełny widok i `ownedParticipantIds`, pozostali tylko własne wpisy.
- Publisher ma dla każdego odbiorcy tworzyć `UPSERT` lub `REMOVE`:
  - aktywny organizator zawsze `UPSERT`;
  - uczestnik bez własnych wpisów `REMOVE`;
  - cancel zawsze `REMOVE` z terminalną rewizją.
- Kontroler ma pozostawić create/list/get/join/withdraw/remove/observe/cancel, dodać `POST :notificationId/invitations/targets` i usunąć pozostałe endpointy.
- Withdraw, remove i cancel zwracają `PartyReadyRoomClientUpdate`; create/get/list/join/observe i resolver zachowują odpowiedzi właściwe dla swojej operacji.
- Zaktualizować Zod DTO/OpenAPI, usunąć martwe DTO i wygenerować od nowa klientów game-client oraz web.

## 4. Gateway i kolejność eventów

- Walidować prywatną kopertę v3 z dyskryminowaną aktualizacją i emitować klientowi `PartyReadyRoomClientUpdate`.
- Zachować prywatny routing `user:<discordId>:guild:<guildId>`, retry i DLQ.
- Zaktualizować testy schematu, routingu `UPSERT`/`REMOVE`, prywatności i odrzucania v2.

## 5. Magazyn i synchronizacja game-client

- Rozszerzyć magazyn o watermark najwyższej rewizji oraz informację `PRESENT`/`REMOVED` dla każdego pokoju.
- Stosować `UPSERT`/`REMOVE` monotonicznie; przy tej samej rewizji `REMOVE` wygrywa.
- Autorytatywna nieobecność REST zapisuje removal watermark równy rewizji baseline, aby opóźniony `UPSERT` tej samej rewizji nie odtworzył pokoju.
- Synchronizacja i socket akceptują wyłącznie v3, czyszczą v2 i chronią nowszy stan socketowy przed starszą odpowiedzią REST.
- Selektory wybierają rolę po aktywnej `(accountId, characterId)`: organizator tylko na dokładnej postaci organizującej, uczestnik po własnym wpisie; dla innej postaci brak aktywnego widoku.
- Usunąć selektory oparte o `APPLIED`/`ACCEPTED` oraz ręczny wybór wielu pokoi.

## 6. Jawne zaproszenia i obserwator

- Uprościć wspólny koordynator FIFO:
  - zamiar przechwytuje pokój, tożsamość organizatora i `participantId[]`;
  - wykonanie wywołuje resolver API;
  - przed każdym helperem ponownie sprawdza projekcję, rolę organizatora i lokalny skład grupy;
  - wywołuje helper najwyżej raz na zwrócony target w danym zamiarze;
  - błąd requestu lub pojedynczego helpera nie blokuje kolejnych zamiarów.
- Usunąć acknowledgement, statusy, timery rezerwacji i hook ręcznego oznaczania.
- Zachować możliwość wielokrotnego szybkiego klikania do czasu wykrycia `IN_PARTY`.
- Rozszerzyć DTO obserwatora o tożsamość organizatora; wysyłać pełny snapshot, również pusty, tylko z dokładnej postaci organizującej po synchronizacji.
- Potwierdzić testem statycznym, że helper grupy jest importowany tylko przez koordynator jawnej akcji, a helper znajomych tylko przez handler dedykowanego kliknięcia.

## 7. Uproszczenie UI

- Wiersz organizatora: postać, `Dodaj do znajomych`, `Zaproś`, `Usuń`.
- Stopka organizatora: stale renderowane `Zaproś wszystkich` oraz `Anuluj zbiórkę`.
- Widok uczestnika: organizator, `partyPresence`, `Wycofaj się`.
- Druga postać organizatora ma używać trybu uczestnika mimo organizatorowej projekcji Discord ID.
- Usunąć akceptację, odrzucenie, ready-check, oznaczanie zaproszeń, `Zamknij po zebraniu grupy`, ręczny selector pokoi oraz powiązane i18n/hooki/komponenty.

## 8. Testy i zakończenie

- API/service/Redis: create/join, blokada organizatora, blokada między pokojami, unikalność `characterId`, wiele postaci jednego Discord ID, idempotencja, wygasłe blokady, withdraw/remove/cancel, kompletna obserwacja i resolver limit/deduplikacja.
- Projekcje/publisher/gateway: widoczność, organizer precedence, ostatni wpis użytkownika, cancel, `UPSERT`/`REMOVE`, routing i v3-only.
- Store/socket/sync: watermark, eventy poza kolejnością, withdraw→rejoin, organizer-alt, autorytatywna nieobecność REST i czyszczenie v2.
- Coordinator/UI: single/all/hotkey, rapid-click FIFO, błąd kolejki, zmiana kontekstu, stale target, lokalne `IN_PARTY`, uproszczone akcje i brak automatycznych helperów.
- Uruchomić pełne testy API, gateway i game-client; build API/gateway/types/game-client; `tsc -b` web; OpenAPI/Orval; lint zmienionych plików; `pnpm format:check`; `git diff --check`.
- Zaktualizować `docs/superpowers/implementation/2026-07-13-party-finder-ready-room-implementation.md` o uproszczony kontrakt v3, usunięty zakres, wyniki weryfikacji i nowe commity.
