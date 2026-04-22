# Chat Enhancements

## Cel

Dokument zbiera wszystkie warianty i kierunki, które były rozważane przy rozwoju czatu w:

- `apps/game-client/src/features/chat`
- `apps/api`
- `apps/gateway`

Zawiera zarówno opcje wdrożone, jak i te odrzucone lub odłożone.

## 1. Backendowy etap normalizacji kontraktu

### Opcja 1: Minimal contract patch

- Dodać `canEdit` i `canDelete` do wiadomości.
- Lekko uporządkować payloady `update` i `delete`.
- Nie ruszać mocniej rozjazdu między historią REST i realtime.

Ocena:

- Plus: najszybszy rollout.
- Minus: zostawia niespójny model wiadomości.

Status:

- Odrzucone jako zbyt mały krok.

### Opcja 2: Contract-first normalization

- Ujednolicić model wiadomości w `api`.
- Ujednolicić create/update/delete eventy w `gateway`.
- Dodać capability metadata `canEdit` i `canDelete`.
- Utrzymać lekkie payloady mutacyjne dla `update/delete`.

Ocena:

- Plus: najlepszy fundament pod kolejne feature'y.
- Minus: większy zakres niż minimalny patch.

Status:

- Wybrane i wdrożone.

### Opcja 3: Gateway-first cleanup

- Najpierw porządkować routing i eventy w `gateway`.
- `api` zostawić prawie bez zmian.

Ocena:

- Plus: mniejszy zakres backendowy.
- Minus: nie rozwiązuje problemu wspólnego kontraktu dla klienta.

Status:

- Odrzucone.

## 2. Kolejność dalszych etapów funkcjonalnych

### Opcja 1: UI-first

- `mentions-lite`
- `reply-lite`
- unifikacja `party gathering`

Ocena:

- Plus: user szybciej widzi nowe feature'y.
- Minus: większe ryzyko dokładania UI na nieuporządkowaną orkiestrację.

Status:

- Odrzucone.

### Opcja 2: Contract-first

- `reply-lite`
- `mentions-lite`
- unifikacja `party gathering` / `notifications`

Ocena:

- Plus: najzdrowsza kolejność architektoniczna.
- Minus: pierwszy etap mniej "widowiskowy".

Status:

- Wybrane.

### Opcja 3: Orchestration-first

- unifikacja `party gathering` / `notifications`
- `reply-lite`
- `mentions-lite`

Ocena:

- Plus: technicznie najczyściej.
- Minus: najgorszy time-to-value.

Status:

- Odrzucone.

## 3. Reply-lite

### Opcja 1: Inline snapshot reply

- Zapisywać:
  - `replyToMessageId`
  - snapshot z `senderNick`, `message`, `type`
- Renderować cytat bez potrzeby dodatkowego fetchu.

Ocena:

- Plus: stabilne nawet gdy oryginalnej wiadomości nie ma w cache.
- Minus: częściowa duplikacja danych.

Status:

- Wybrane i wdrożone.

### Opcja 2: Id-only reply

- Trzymać tylko `replyToMessageId`.

Ocena:

- Plus: najczystszy kontrakt.
- Minus: wymaga fetchowania po id lub trwałej persystencji dużo wcześniej.

Status:

- Odrzucone.

### Opcja 3: Client-only optimistic reply

- UI pokazuje reply lokalnie bez pełnego backendowego wsparcia.

Ocena:

- Plus: najszybsze.
- Minus: zły kierunek, bo historia i realtime zaczynają się rozjeżdżać.

Status:

- Odrzucone.

## 4. Mentions-lite

### Opcja 1: Render-first highlighting

- Parser mentionów działa po stronie klienta.
- Treść wiadomości jest dzielona na segmenty.
- `@Nick` i `@NazwaRoli` są podświetlane przy renderze.
- Trafienie w bieżącego gracza lub jego rolę daje mocniejszy highlight.

Ocena:

- Plus: brak zmian w kontrakcie czatu.
- Minus: mentiony są interpretowane, a nie zapisane jawnie.

Status:

- Wybrane i wdrożone.

### Opcja 2: Send-time normalization

- Klient parsuje mentiony przy wysyłce.
- Backend odsyła jawne metadata mentionów.

Ocena:

- Plus: lepszy fundament pod unread, push i search.
- Minus: za duży zakres jak na wersję lite.

Status:

- Odłożone.

### Opcja 3: Loose text highlight

- Podświetlać wszystko, co wygląda jak `@coś`, bez walidacji po członkach i rolach.

Ocena:

- Plus: najprostsze.
- Minus: dużo false positive.

Status:

- Odrzucone.

## 5. Mentions-lite z wpisem w notifications

### Opcja 1: Client-synthesized mention notifications

- Listener czatu tworzy lokalny wpis w `notifications`.
- Dedupe po stabilnym kluczu opartym o `guildId` i `messageId`.
- Brak osobnego eventu backendowego tylko dla mentionów.

Ocena:

- Plus: reuse obecnego UI powiadomień.
- Minus: matching jest po stronie klienta.

Status:

- Wybrane i wdrożone.

### Opcja 2: Backend-generated mention notifications

- Backend lub gateway wykrywa mentiony i emituje osobny event powiadomienia.

Ocena:

- Plus: najbardziej authoritative.
- Minus: za szeroki zakres na etap lite.

Status:

- Odłożone.

### Opcja 3: Chat-only highlights

- Tylko highlight w czacie.
- Bez wpisu w listę powiadomień.

Ocena:

- Plus: najmniejszy zakres.
- Minus: nie spełnia wymagania produktowego.

Status:

- Odrzucone.

## 6. Źródło danych o rolach dla mentionów

### Opcja 1: Wyciąganie ról z pełnej listy members

- Pobierać pełnych członków gildii.
- Z ich ról budować słownik nazw ról.

Ocena:

- Plus: działa bez nowego endpointu.
- Minus: za ciężkie tylko po to, by poznać nazwy ról.

Status:

- Odrzucone.

### Opcja 2: Dedykowane użycie `/guilds/:guildId/roles`

- Korzystać z istniejącego endpointu ról.
- Osobno pobierać `members/@me` dla ról bieżącego użytkownika.

Ocena:

- Plus: lżejsze i czytelniejsze źródło danych.
- Minus: wymagało odblokowania endpointu po stronie `api`.

Status:

- Wybrane i wdrożone.

## 7. Unifikacja `party gathering` / `notifications`

### Opcja 1: Outgoing-first unification

- Wyciągnąć wspólny orchestration helper dla:
  - tworzenia zwykłego `party gathering`
  - tworzenia NPC `party gathering`
  - zwykłych NPC notification-backed chat message
  - zwykłych `!notification` z `chat-input` i `command`
- Zostawić ingress realtime na osobny etap.

Ocena:

- Plus: największa redukcja duplikacji przy małym ryzyku regresji.
- Minus: listenery realtime nadal pozostają rozdzielone.

Status:

- Wybrane i wdrożone.

### Opcja 2: Ingress + egress unification

- Połączyć wspólnym pipeline także:
  - `useNotifications`
  - `usePartyGatheringSocket`
  - lokalne kolejki gotowości i filtrowanie eventów
- Ograniczyć rozjazdy między socket listenerami i lokalnymi side effectami.

Ocena:

- Plus: domyka temat architektonicznie po stronie klienta.
- Minus: większe ryzyko regresji realtime niż w etapie outgoing-only.

Status:

- Następny krok.

### Opcja 3: Full chat-notification bus refactor

- Przebudować od razu całość wokół jednego event orchestration layer dla:
  - czatu
  - mentionów
  - notificationów
  - party gathering

Ocena:

- Plus: najczystsza architektura docelowa.
- Minus: za duży zakres na jeden etap.

Status:

- Odłożone.

## 8. Następny krok

- Ujednolicić ingress realtime po stronie `game-client`.
- Zacząć od audytu i spięcia:
  - `apps/game-client/src/features/notifications/hooks/use-notifications.tsx`
  - `apps/game-client/src/features/party-finder/hooks/use-party-gathering-socket.ts`
- Cel:
  - jeden spójny pipeline dla eventów `notification`, `party gathering` i ich lokalnych side effectów
  - mniej duplikacji w filtrowaniu eventów, readiness queue i aktualizacji store
  - bez ruszania backend contractów w tym kroku

Ocena:

- Plus: najczystsze i najmniej kosztowne.
- Minus: wymagało odblokowania odczytu ról dla zwykłego klienta.

Status:

- Wybrane i wdrożone.

## 7. Unifikacja party gathering / notifications

### Opcja 1: Outgoing-first unification

- Ujednolicić ścieżki wychodzące:
  - `use-party-command`
  - `create-party-gathering-form`
  - `npc-list-item`
- Wydzielić wspólny orchestration helper dla:
  - `createPartyGathering`
  - aktualizacji `party-finder.store`
  - wysyłki wiadomości czatu
  - otwarcia odpowiedniego okna

Ocena:

- Plus: największy zysk przy najmniejszym ryzyku.
- Minus: jeszcze nie porządkuje wszystkich listenerów wejściowych.

Status:

- Aktualnie wybrany jako następny krok.

### Opcja 2: Ingress + egress unification

- Zrobić opcję 1.
- Dodatkowo połączyć:
  - `useNotifications`
  - `usePartyGatheringSocket`
- Wspólny buffered pipeline dla readiness, mute, world filter i open-notifications.

Ocena:

- Plus: czyści także ścieżki przychodzące.
- Minus: większe ryzyko regresji realtime.

Status:

- Kandydat na krok po `outgoing-first`.

### Opcja 3: Full chat-notification bus refactor

- Jeden wspólny orchestration layer dla:
  - zwykłych notificationów
  - party gathering
  - mention alertów
  - części flow czatu

Ocena:

- Plus: najczystsza architektura docelowa.
- Minus: zbyt duży zakres na jeden slice.

Status:

- Odłożone.

## 8. Największe obecne źródła rozrostu

### Outgoing flow

- `use-party-command`
- `create-party-gathering-form`
- `npc-list-item`

W każdym z tych miejsc powtarza się podobna sekwencja:

- anulowanie starego `party gathering`
- utworzenie nowego `party gathering` notification
- aktualizacja `party-finder.store`
- wysłanie powiązanej wiadomości czatu
- otwieranie okna

### Incoming flow

- `useNotifications`
- `usePartyGatheringSocket`
- część logiki w `useChatMessagesListener`

Te ścieżki mają osobne kolejki oczekujących eventów, osobne filtrowanie i osobne efekty uboczne.

## 9. Co już jest wdrożone

- backendowa normalizacja kontraktu wiadomości
- capability metadata `canEdit` / `canDelete`
- pełny `reply-lite`
- `mentions-lite` z highlightem
- mention alerts w panelu powiadomień
- backendowy cleanup anulowania `party gathering`
- odczyt ról przez `/guilds/:guildId/roles` na potrzeby klienta

## 10. Update po etapie outgoing-first

Status:

- `outgoing-first unification` jest wdrożone.
- Wspólne helpery obsługują teraz:
  - zwykłe `party gathering`
  - NPC `party gathering`
  - NPC notification-backed chat
  - zwykłe `!notification` z `chat-input` i `command`

## 11. Rekomendowany następny krok

Następny etap to `ingress + egress unification`, ale już tylko po stronie ingress realtime, czyli:

- zrobić audit i uprościć:
  - `apps/game-client/src/features/notifications/hooks/use-notifications.tsx`
  - `apps/game-client/src/features/party-finder/hooks/use-party-gathering-socket.ts`
- ujednolicić filtrowanie eventów, readiness queue i lokalne side effecty
- ograniczyć liczbę miejsc, które niezależnie aktualizują `notifications` i `party-finder.store`
- nie ruszać backend contractów w tym kroku
