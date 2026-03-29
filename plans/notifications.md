# System Powiadomień v1: API + Dedicated Worker + Discord Bot

## Summary
Zostawiamy `apps/api` jako source of truth dla konfiguracji, uprawnień i zdarzeń domenowych, ale wykonanie powiadomień wydzielamy do osobnego workera, np. `apps/notifications-worker`. `apps/discord-bot` pozostaje adapterem dostarczającym wiadomości Discord i źródłem informacji o dostępnych kanałach/guild state.

Model v1 będzie mieszany:
- reguły gildyjne dla publicznych powiadomień typu resp/spawn
- reguły użytkownika dla obserwowanych itemów i prywatnych targetów
- targety dostarczenia rozdzielone na `guild` i `user`
- silnik hybrydowy: scheduled reminders jako precomputed jobs, insta notyfikacje bezpośrednio z eventów domenowych

## Key Changes
### 1. API jako owner konfiguracji i eventów
- Dodać nowy moduł powiadomień konfiguracyjnych w `apps/api` z encjami:
  - `NotificationTarget`
  - `NotificationRule`
  - `NotificationJob`
  - `WatchedItem`
- `NotificationTarget` musi być neutralny kanałowo:
  - `ownerType`: `guild | user`
  - `ownerId`
  - `provider`: na start `discord`
  - `targetType`: `channel | dm`
  - `externalId`: np. Discord channel id lub user id/DM target id
  - pola metadanych do cache display name / guild name / flags
  - status aktywności i timestamp ostatniej synchronizacji
- `NotificationRule` musi wspierać:
  - `ownerType`, `ownerId`
  - `triggerType`: np. `timer_before_spawn`, `npc_spawned`, `watched_item_dropped`
  - `guildId` i `world` tam, gdzie wymagane
  - filtry domenowe, np. `npcId`, `itemId`, lista NPC, lista itemów
  - `leadTimeMinutes` dla scheduled reminders
  - listę przypiętych targetów
  - `enabled`, `dedupeWindowSeconds`
- `WatchedItem` jako osobna encja użytkownika, powiązana z regułami lub używana jako wygodna nakładka UI nad regułą `watched_item_dropped`
- `apps/api` publikuje zdarzenia domenowe przez RabbitMQ zamiast próbować samemu wysyłać:
  - `notifications.timer.updated`
  - `notifications.npc.spawned`
  - `notifications.loot.created`
  - opcjonalnie `notifications.rule.changed`
- Obecny `apps/api/src/notifications` zostaje potraktowany jako legacy/manual notification flow; nie mieszać go z nowym silnikiem poza ewentualnym współdzieleniem helperów

### 2. Dedicated worker jako execution engine
- Utworzyć nową aplikację `apps/notifications-worker`
- Worker konsumuje eventy domenowe i zarządza wykonaniem:
  - na `timer.updated` przelicza tylko powiązane scheduled rules
  - materializuje `NotificationJob` dla reminderów typu "5 min przed minSpawn"
  - na `npc.spawned` i `loot.created` robi bezpośrednie dopasowanie reguł i od razu emituje komendy dostarczenia
- `NotificationJob` powinien mieć:
  - `ruleId`, `targetId`, `scheduledFor`, `status`
  - klucz idempotencji
  - payload snapshot potrzebny do wysyłki
  - `attemptCount`, `lastError`, `processedAt`
- Worker wykonuje due jobs po indeksie `status + scheduledFor`
- Przy zmianie timera worker anuluje/przepisuje tylko joby dla dotkniętego NPC/guild/world
- Dedupe:
  - scheduled reminder: unikalność per `ruleId + targetId + sourceEntity + scheduledFor`
  - insta event: unikalność per `ruleId + targetId + sourceEventId`
- Retry/backoff w workerze, bez retry loop w `apps/discord-bot`

### 3. Discord bot jako provider delivery + source kanałów
- `apps/discord-bot` dostaje dwa nowe obowiązki:
  - ekspozycja/synchronizacja listy kanałów tekstowych i capability do DM
  - konsumpcja komendy typu `notifications.discord.send`
- Bot nie zna reguł biznesowych ani schedulerów
- Bot waliduje tylko techniczne możliwości dostarczenia:
  - czy kanał istnieje
  - czy bot ma uprawnienia do wysyłki
  - czy DM są możliwe
- Jeśli wysyłka się nie powiedzie, bot odsyła status błędu/asercję do workera lub loguje outcome na kolejkę statusową
- Kanały do konfiguracji w `apps/web` powinny pochodzić z danych zsynchronizowanych przez `apps/discord-bot`, nie z ręcznie wpisywanych ID

### 4. Web configuration in `apps/web`
- Dodać w ustawieniach gildii nową sekcję powiadomień:
  - lista targetów gildyjnych Discord channel
  - lista reguł gildyjnych
  - formularze dla `timer_before_spawn` i `npc_spawned`
- Dodać w ustawieniach użytkownika sekcję powiadomień:
  - targety użytkownika: Discord DM i ewentualnie wybrane kanały
  - obserwowane itemy
  - reguły użytkownika
- Wszystkie teksty przez i18n
- Uprawnienia:
  - guild rules/targets tylko dla ról z odpowiednimi permissionami zarządzania
  - user rules/targets tylko dla właściciela konta
- UI powinno prowadzić użytkownika przez wybór:
  - owner scope
  - trigger type
  - filtry domenowe
  - targety
  - opcjonalny lead time

## Public Interfaces / Types
- Nowe API w `apps/api`:
  - CRUD dla `NotificationTarget`
  - CRUD dla `NotificationRule`
  - CRUD/list dla `WatchedItem`
  - endpointy pomocnicze do pobrania dostępnych Discord targetów dla guild/user
- Nowe routing keys:
  - domenowe inputy do workera: `notifications.timer.updated`, `notifications.npc.spawned`, `notifications.loot.created`, `notifications.rule.changed`
  - output workera do providerów: `notifications.discord.send`
  - opcjonalnie status providerów: `notifications.delivery.result`
- Nowe typy współdzielone:
  - `NotificationOwnerType`
  - `NotificationProvider`
  - `NotificationTargetType`
  - `NotificationTriggerType`
  - `NotificationJobStatus`

## Test Plan
- API:
  - tworzenie i walidacja guild/user targets
  - uprawnienia dla guild rules i izolacja user rules
  - tworzenie reguły remindera dla NPC z lead time
  - tworzenie obserwowanego itemu i mapowanie na regułę
- Worker:
  - `timer.updated` tworzy job na reminder
  - zmiana `minSpawnTime` przepisuje wcześniejsze joby
  - `npc.spawned` wysyła insta notyfikację bez tworzenia future joba
  - `loot.created` trafia tylko do użytkowników obserwujących item
  - dedupe blokuje duplikaty przy ponownym przetworzeniu eventu
  - retry/backoff działa dla błędów providera
- Discord bot:
  - pobranie/synchronizacja kanałów tekstowych
  - wysyłka do kanału
  - wysyłka DM
  - poprawna obsługa braków uprawnień / brakującego kanału
- E2E scenariusze:
  - guild reminder "5 min przed spawnem" dla NPC
  - instant "potwór właśnie zrespił"
  - watched item drop dla użytkownika
  - ta sama reguła z wieloma targetami
  - anulowanie lub wyłączenie reguły zatrzymuje przyszłe joby

## Assumptions
- v1 wspiera tylko providera `discord`, ale model danych pozostaje neutralny pod przyszły `telegram`
- scheduled reminders są materializowane do `NotificationJob`, insta notyfikacje lecą bezpośrednio z eventów
- source of truth dla reguł i targetów pozostaje w bazie `apps/api`, bez osobnej bazy dla workera w v1
- worker jest osobnym deploym, ale korzysta z tych samych encji i RabbitMQ
- `apps/discord-bot` będzie rozszerzony o dostęp do kanałów tekstowych i DM capability
- obecny moduł `apps/api/src/notifications` nie jest bazą nowego systemu; można go utrzymać równolegle jako istniejący feature manualnych notyfikacji
