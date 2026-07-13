# Party Finder Ready Room v3 — zapis implementacji

Data zakończenia: 2026-07-13
Branch: `feature/lootlog-gameplay-coordination`
Commit funkcjonalny: `3a104152a` (`feat: simplify party ready rooms`)

## Wynik

Ready Room został uproszczony do szybkiego klejenia grupy. Zgłoszenie gracza natychmiast dodaje wybraną postać jako aktywnego uczestnika pokoju. Organizator nie akceptuje zgłoszeń, nie prowadzi ręcznych statusów zaproszeń i nie uruchamia sprawdzania gotowości.

Zaproszenie w grze nadal jest wyłącznie jawną akcją użytkownika. Lootlog nie zaprasza automatycznie po zgłoszeniu, zdarzeniu socketowym, obserwacji składu ani zmianie stanu. Helper gry może zostać uruchomiony tylko przez:

- kliknięcie `Zaproś` przy konkretnej postaci;
- kliknięcie `Zaproś wszystkich`;
- skonfigurowany hotkey `invite-all`, który również jest świadomą akcją użytkownika.

Dodanie do znajomych także pozostaje oddzielnym, jawnym kliknięciem.

## Finalny model v3

- Kontrakt używa wyłącznie `schemaVersion: 3` oraz kluczy Redis `party-ready-room:v3:*`. Stan v2 nie jest odczytywany ani migrowany.
- Aktywny uczestnik zawiera tylko `participantId`, `discordId`, postać, `partyPresence` i znaczniki czasu.
- Usunięto stany aplikacji, gotowość, status i źródło zaproszenia, rezerwacje komend, potwierdzenia, adnotacje oraz `readyCheck`.
- Agregat ma stan `ACTIVE` albo serwerowy `CANCELLED`. `CANCELLED` jest 60-sekundowym tombstonem i nigdy nie jest wysyłany jako projekcja.
- Aktualizacja klienta jest unią `UPSERT` albo `REMOVE`. `REMOVE` wygrywa z `UPSERT` o tej samej rewizji, co zapobiega odtwarzaniu usuniętego pokoju przez spóźniony event.
- Projekcja ma zawsze status `ACTIVE`. Organizator widzi wszystkie wpisy, a uczestnik tylko wpisy należące do jego Discord ID.

## Wiele kont i postaci

- Tożsamość wpisu oraz rola w interfejsie są wybierane po `accountId + characterId`, a nie wyłącznie po Discord ID.
- Dwie przeglądarki z tym samym Discord ID mogą niezależnie dodać dwie różne postacie. Oba wpisy pojawiają się w projekcji tego użytkownika.
- Użytkownik organizujący pokój jedną postacią może dołączyć do tego samego pokoju inną własną postacią.
- Jedna postać, identyfikowana globalnie przez `(world, characterId)`, może zajmować tylko jeden aktywny Ready Room — jako organizator albo uczestnik.
- Ponowne dołączenie tej samej postaci przez tego samego właściciela do tego samego pokoju jest idempotentne. Konflikt właściciela zwraca `CHARACTER_ALREADY_JOINED`, a zajęcie innego pokoju `ALREADY_JOINED_ELSEWHERE`.
- Wycofanie lub usunięcie jednego alta zwalnia tylko jego blokadę. Indeks wspólnego Discord ID pozostaje aktywny, dopóki w pokoju istnieje inny wpis tego użytkownika.

## API, Redis i publikacja

- `POST /applications` wykonuje atomowe dołączenie uczestnika bez kroku akceptacji.
- Organizator może usunąć uczestnika, uczestnik może wycofać własny wpis, a organizator może anulować zbiórkę.
- `POST /invitations/targets` jest bezstanowym resolverem maksymalnie 100 identyfikatorów uczestników. Zwraca unikalne, nadal aktywne postacie `OUTSIDE` i nie zapisuje informacji o zaproszeniu.
- Obserwacja grupy przyjmuje kompletny snapshot, także pusty, oraz dokładną tożsamość konta i postaci organizatora. Aktualizuje wyłącznie `IN_PARTY`/`OUTSIDE`.
- Redis/Lua atomowo tworzy pokój, zakłada blokadę postaci, dołącza uczestnika, zwalnia pojedynczy wpis i usuwa wszystkie indeksy przy anulowaniu.
- API publikuje spersonalizowaną kopertę `{ recipientDiscordId, eligibleGuildIds, update }`. Gateway waliduje prywatność i kieruje ją tylko do pokoi właściwego użytkownika i gildii.
- Zaktualizowano OpenAPI oraz klientów Orval dla game-client i web; usunięto wygenerowane modele i endpointy starego przepływu.

## Game client i interfejs

- Usunięto selektor zgłoszeń, akceptację, odrzucenie, gotowość, ręczne oznaczanie zaproszeń oraz `Zamknij po zebraniu grupy`.
- Widok organizatora zawiera listę aktywnych postaci z akcjami: dodaj do znajomych, zaproś i usuń.
- Stopka organizatora zawiera stale dostępne `Zaproś wszystkich` oraz `Anuluj zbiórkę`.
- Widok uczestnika pokazuje organizatora, obecność własnej aktywnej postaci i akcję wycofania.
- Szybkie, wielokrotne kliknięcia `Zaproś wszystkich` nie są scalane ani blokowane. Każde jawne kliknięcie trafia do wspólnej kolejki FIFO.
- Przed resolverem oraz przed każdym helperem gry klient ponownie sprawdza pokój, połączenie, aktywne konto i postać organizatora, obecność celu w Ready Room oraz lokalny skład grupy.
- Błąd jednego celu nie blokuje kolejnych celów ani następnego kliknięcia. Uczestnik pozostaje możliwy do ponownego zaproszenia, dopóki obserwator nie oznaczy go jako `IN_PARTY`.
- Synchronizacja REST/socket przechowuje watermark rewizji dla stanów `PRESENT` i `REMOVED`. Brak pokoju w autorytatywnym REST tworzy watermark usunięcia bez kasowania nowszego eventu socketowego.
- Wszystkie teksty interfejsu korzystają z i18n; usunięto nieużywane teksty starego procesu.

## Usunięte funkcjonalności

- akceptowanie i odrzucanie zgłoszeń przez organizatora;
- stany `APPLIED`, `ACCEPTED`, `DECLINED`, `WITHDRAWN`;
- sprawdzanie gotowości i odpowiedzi uczestników;
- ręczne oznaczanie zaproszenia jako wysłane, niewysłane lub nieznane;
- rezerwacje, potwierdzenia i retry statusów zaproszeń;
- przycisk i endpoint `Zamknij po zebraniu grupy` oraz stan `CLOSED`;
- kompatybilność z kontraktem i kluczami Redis v2.

## Weryfikacja

Zakończone powodzeniem:

- API: 92 pliki testowe, 942 testy;
- Gateway: 17 plików testowych, 189 testów;
- Game client: 142 pliki testowe, 669 testów;
- skoncentrowane testy Ready Room API: 5 plików, 30 testów;
- buildy produkcyjne API, gateway, game-client i web;
- build `@lootlog/types`;
- generowanie i kontrola OpenAPI oraz klientów Orval;
- lint wszystkich plików objętych zmianą: 0 ostrzeżeń i 0 błędów;
- `git diff --check` oraz pełne hooki pre-commit;
- audyt wyszukiwania potwierdzający brak starego kontraktu v2 i usuniętych akcji w kodzie Ready Room;
- audyt wywołań `inviteCharacterToParty`: nowy Party Finder wywołuje go tylko w koordynatorze uruchamianym przez jawne kliknięcie lub hotkey.

Znane, niezwiązane ostrzeżenia buildów pozostały bez zmian: pseudoklasa CSS `.all:b`, ścieżki kursora rozwiązywane w runtime oraz ostrzeżenie `eval` pochodzące z `lottie-web`.

## Granice weryfikacji

- Zgodnie z instrukcją repozytorium aplikacja nie była ręcznie uruchamiana.
- Skrypty Lua i adapter Redis są pokryte testami granic repozytorium, ale nie wykonywano osobnego testu integracyjnego z zewnętrzną instancją Redis.
- Końcowy, minimalny wyścig między ostatnim lokalnym sprawdzeniem a wywołaniem zewnętrznej komendy gry nie może zostać całkowicie wyeliminowany po stronie klienta.

## Commity finalnego uproszczenia

- `bf262dcef` — specyfikacja uproszczonego Ready Room;
- `8b42e9a39` — doprecyzowanie lifecycle;
- `cfa39afed` — kolejność eventów i rewizji;
- `8d4ea70e1` — globalne blokady postaci;
- `70ca687c6` — plan implementacji;
- `3a104152a` — kontrakt v3, API, Redis, gateway, klient gry, testy i wygenerowane klienty.
