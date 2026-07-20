# `apps/game-client` performance report

Data pomiaru: 2026-07-20. Środowisko: Apple M5 Pro, Node 24.16.0,
Vitest 4.1.8 oraz Chrome 150. Chromium był uruchamiany dla NI i SI przy
normalnej szybkości oraz z throttlingiem CPU 4×. Benchmarki Node używały 8
prób rozgrzewających i 25 prób mierzonych.

## Wynik

Wszystkie automatyczne bramki przeszły. Najwolniejszy zmierzony warm
notification `receive→paint` p95 wyniósł 13,3 ms przy CPU 4×. Nie
zarejestrowano long tasków, a przez 30 sekund idle nie wystąpił żaden commit
Reacta, zapis persistence ani callback `MutationObserver`.

### Kontrole jakości

| Kontrola                      |                Baseline |                    Po zmianach |    Wynik |
| ----------------------------- | ----------------------: | -----------------------------: | -------: |
| Testy                         |  157 plików / 754 testy |         194 pliki / 998 testów |     PASS |
| TypeScript                    |                    PASS |                           PASS |     PASS |
| Coverage statements           |                  65,64% |                         74,56% | +8,92 pp |
| Coverage branches             |                  58,35% |                         64,92% | +6,57 pp |
| Coverage functions            |                  63,62% |                         71,55% | +7,93 pp |
| Coverage lines                |                  66,87% |                         75,87% | +9,00 pp |
| Changed-code coverage S/B/F/L |             brak bramki | 88,09 / 72,09 / 88,22 / 97,70% |     PASS |
| Lint                          | 0 errors / 123 warnings |          0 errors / 0 warnings |     PASS |
| Browser performance           |            brak fixture | perf + interakcje bez regresji |     PASS |
| Visual/lifecycle              |    brak pełnej macierzy |  80/80 visual, 30/30 lifecycle |     PASS |

### Bundle release

Pomiary kompresji pochodzą z twardej bramki release (`gzip` level 9,
`brotli` quality 11), a nie z przybliżenia Vite.

| Artefakt |    Baseline | Po zmianach | Zmiana |            Budżet |
| -------- | ----------: | ----------: | -----: | ----------------: |
| Raw      | 1 684 766 B | 1 544 284 B |  −8,3% |                 — |
| Gzip     |   498 542 B |   455 365 B |  −8,7% | ≤460 000 B — PASS |
| Brotli   |   395 180 B |   357 307 B |  −9,6% | ≤363 000 B — PASS |

Framer Motion został usunięty z sześciu miejsc na rzecz CSS/WAAPI. React
Compiler pozostaje włączony, Terser pozostaje minifierem release, a analyzer
uruchamia się wyłącznie przez `ANALYZE=1` i zapisuje wynik poza `dist`.

## Hot paths

Poniższe pary są bezpośrednio porównywalne z baseline'em na tej samej klasie
wejścia. Dla usuwania NPC pokazany jest pełny rzeczywisty processor, nie tylko
akcja store'a.

| Scenariusz                               |  Baseline med./p95 | Po zmianach med./p95 | Zmiana med./p95 |
| ---------------------------------------- | -----------------: | -------------------: | --------------: |
| 500 aktualizacji `others` w 5000         |   0,509 / 0,552 ms |     0,041 / 0,078 ms |  −91,9 / −85,9% |
| Usunięcie 2500 z 5000 NPC, processor E2E | 25,166 / 25,281 ms |     0,328 / 0,382 ms |  −98,7 / −98,5% |
| Timer pipeline, 5000 rekordów            | 28,441 / 30,345 ms |     1,992 / 3,958 ms |  −93,0 / −87,0% |
| Akumulacja 10 000 eventów bitwy          | 27,653 / 28,000 ms |     0,813 / 0,843 ms |  −97,1 / −97,0% |

| Dodatkowy scenariusz              |  Mediana |      p95 |               Twarda asercja |
| --------------------------------- | -------: | -------: | ---------------------------: |
| Startup queue drain, 1000 eventów | 0,006 ms | 0,013 ms |                 ≤8 ms — PASS |
| Proxy manager, 1000 eventów       | 0,058 ms | 0,071 ms |     jeden processor na event |
| Notification batch 100, cap 50    | 0,035 ms | 0,067 ms |    1 publikacja, 50 rekordów |
| Presence 500/5000                 | 0,730 ms | 0,836 ms |          1 structural update |
| Chat pipeline, 1200 wiadomości    | 0,622 ms | 0,644 ms | kolejność i liczba zachowane |
| Friends processor, 5000           | 0,071 ms | 0,087 ms |                 1 publikacja |
| NPC add, 5000                     | 0,311 ms | 0,390 ms |                 1 publikacja |
| NPC remove action, 2500 z 5000    | 0,129 ms | 0,183 ms |                 1 publikacja |

Pełny wygenerowany raport znajduje się lokalnie w
`artifacts/hot-path-benchmarks/hot-paths.md`. Benchmark uruchamia się przez:

```sh
corepack pnpm --filter @lootlog/game-client bench:hot-paths
```

## Chromium notification pipeline

Każdy profil obejmował 2 warmupy oraz 10 mierzonych prób dla 0→1, 1→2,
10→11, 49→50, eviction, merge, scroll, burstów 10/50/100 i auto-hide.
Fixture ładuje rzeczywisty zbudowany userscript, React, Radix i animacje.

| Interfejs | CPU | Maks. warm paint p95 | Pierwsza zimna |
| --------- | --: | -------------------: | -------------: |
| NI        |  1× |               8,6 ms |         7,9 ms |
| NI        |  4× |              13,3 ms |        12,0 ms |
| SI        |  1× |               9,9 ms |         7,7 ms |
| SI        |  4× |              11,5 ms |        11,5 ms |

| Bramka                                            |         Wynik |         Limit |
| ------------------------------------------------- | ------------: | ------------: |
| Najgorszy warm `receive→paint` p95                |       13,3 ms |      ≤16,7 ms |
| Najgorsza pierwsza zimna notyfikacja              |       12,0 ms |        ≤33 ms |
| Najdłuższy long task                              |          0 ms |        <50 ms |
| Publikacje store / synchroniczne commity ingressu |         1 / 1 |         1 / 1 |
| DOM notyfikacji                                   |            50 |           ≤50 |
| Storage write dla już otwartego okna              |             0 |             0 |
| Overlay frame p95 delta                           |  maks. 0,1 ms |         ≤2 ms |
| Dropped-frame delta                               |          0 pp |       ≤0,5 pp |
| Input→paint delta                                 |  maks. 0,6 ms |        ≤10 ms |
| Idle 30 s: commits/writes/body/all observers      | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |

Audio cold burst tworzy jedną instancję i wykonuje jedno odtworzenie; warm
burst ponownie używa puli. Odrzucenie autoplay jest obsłużone bez błędu strony.
Macierz wizualna obejmuje NI/SI, oba motywy, drag, lock, opacity, scroll i typy
okien: 80/80 przypadków przeszło, wszystkie PNG są niepuste.

### Interakcyjne bramki regresji

Pełny przebieg Chromium dla NI/SI przy CPU 1×/4× przeszedł wszystkie bramki
wydajnościowe i interakcyjne. Osobna wizualna macierz goldenów przeszła 80/80
przypadków (20 dla każdej kombinacji NI/SI × dark/light). Oprócz metryk
notyfikacji fixture wykonuje interakcje chroniące regresje zgłoszone po
pierwszym etapie optymalizacji:

| Bramka                                           |                                            Wynik |
| ------------------------------------------------ | -----------------------------------------------: |
| Timer aktywny przez 1,1 s                        |  wartość zmieniła się dokładnie o sekundę — PASS |
| Radius kafla timera / tooltipu / guild selectora |                        4 px / 4 px / 4 px — PASS |
| Focus ring inputu / ring guild selectora         |                               3 px / 1 px — PASS |
| Radius customowego koloru w menu timera          |                                      6 px — PASS |
| Portale tooltip/context menu/select/popover      |                   wewnątrz granicy motywu — PASS |
| Auto-hide notification                           | obwód znika monotonicznie wzdłuż krawędzi — PASS |
| Zmiana gildii w chacie                           |             fizyczny dystans od dołu 0 px — PASS |
| Mały scroll chatu o 32 px w górę                 |      po remeasurement nadal 32 px od dołu — PASS |

Osobny test produkcyjnego portalu timerów pod torbą chroni małe filtry
levelowe przed natywnymi stepperami oraz sprawdza SI `user-select` i dziedziczenie
kursora na wewnętrznych ścieżkach ikon.

W każdym z czterech profili 30-sekundowy idle zakończył się wynikiem
`0 / 0 / 0` dla commitów Reacta, zapisów persistence i callbacków observerów.

Pełny raport, JSON, trace'y overlay ON/OFF i screenshoty są generowane w
`artifacts/browser-perf/` przez:

```sh
corepack pnpm --filter @lootlog/game-client test:browser-perf
```

## Retained heap i soak

Przyspieszony soak przetworzył 500 zmian mapy, 50 000 chatów, 50 000
notyfikacji, 1000 przechwyceń bitwy i 1000 logów.

| Pomiar                               |                      Wynik |                     Limit |
| ------------------------------------ | -------------------------: | ------------------------: |
| Heap po warmupie                     |                  37,58 MiB |                         — |
| Szczytowy heap podczas soak          |                 150,89 MiB |                         — |
| Heap po pełnym GC                    |                  37,90 MiB |         ≤42,58 MiB — PASS |
| Wzrost po GC                         |                   0,30 MiB |          ≤2,00 MiB — PASS |
| Trend                                |          0,06 MiB/iterację | ≤0,25 MiB/iterację — PASS |
| Chat retained                        | 3000, dokładnie 300/gildię |                300/gildię |
| Notifications retained               |          50 + 50 deadlines |                        50 |
| Logs retained                        |              35 / 4,95 MiB |               200 / 5 MiB |
| Battle capture                       |              12 / 0,28 MiB |            10 000 / 5 MiB |
| Transient records po 500 map changes |                          0 |                         0 |

## Najważniejsze zmiany implementacyjne

- Singleton runtime z idempotentnym bootstrapem i pełnym teardownem Reacta,
  public API, socketów, proxy, listenerów, query, audio i transient state.
- Własnościowe, idempotentne proxy `GameEventsManager`; zachowane `this`,
  argumenty, return/throw, friends stripping i kolejność processor→game→after.
  Queue ma limit 1000/2 MiB i kontrolowany teardown po overflow.
- Jedna transakcja store na processor i batchowe `upsertMany`/`removeMany`.
  Battle ma akumulator O(1), niemutowalny snapshot i lock przeciw podwójnemu
  submitowi podczas asynchronicznego SHA-256.
- Jeden atomiczny notification presenter: cap 50 newest-first, atomowe deadline'y,
  brak zbędnego focus persistence, list-level queries i bez layout animation.
- Wspólne clocki i aktywacja tylko dla widocznych timerów, NPC detectora,
  event mode, map pings i AirTags. Chat w tle utrzymuje tylko ingress/unread.
- Pointer Events bez listenerów idle; maksymalnie jeden update pozycji na klatkę
  i persistence dopiero po `pointerup`.
- Bounded retention dla chatu, tooltipów, logów, battle, ready-room, invitations,
  map pings, AirTags i persistent character cache.
- CSS variables/utilities są pod `#lootlog-root`; konieczne poprawki hosta są
  aktywne wyłącznie pod `body:has(> #lootlog-root)`. Każde okno ma
  `contain: layout style`.
- Radix Tooltip, Context Menu, Popover i Select używają wspólnego kontenera
  portali pod `#lootlog-root`, dzięki czemu zachowują tokeny radius/ring/theme.
- Customowe style timerów pod torbą obejmują także `.ll-theme-boundary`, w tym
  ukrywanie stepperów pól levelowych oraz SI `user-select` i zagnieżdżony kursor.
- Pula audio arbitruje po parze `(kanał, URL)`, więc różne zwykłe dźwięki nie
  przerywają się wzajemnie, a ta sama próbka nadal jest współdzielona.
- `AnimatedWindow` pozostaje zamontowane na czas animacji wyjścia z awaryjnym
  timeoutem 150 ms. Wirtualizacja NPC nie odtwarza animacji wejścia po samym
  scrollu; zachowuje ograniczone animacje exit i reorder dla widocznych wierszy.
- CI ma rzeczywiste zadania Turbo dla lint, typecheck, coverage, hot paths,
  browser performance i bundle budget. Lint używa `--deny-warnings`.

## Regresje funkcjonalne

Object i JSON-string przechodzą przez realny `GameEventsManager` oraz realne
procesory do identycznych snapshotów store'ów. Osobne goldeny chronią pełną
kolejność wszystkich kluczy dispatchera, return/throw/re-entrancy/friends
stripping oraz normalny battle DTO i oba hashe. Overflow bitwy nigdy nie wysyła
częściowego requestu. Pozostałe testy pokrywają newest-50, merge/dedupe,
auto-hide, pause/resume, chat reconnect/order/cap, audio rejection, lifecycle,
StrictMode i podwójny bootstrap. Interakcyjny Chromium dodatkowo chroni
sekundowy clock timerów, radiusy i ringi portali, fizyczny obwód auto-hide oraz
zachowanie sticky-bottom/scroll anchoring przy zmianie gildii i małym geście
scrollowania w górę. Portalowy test timerów chroni również małe filtry levelowe
oraz odpowiadające im style hosta NI/SI.

## Ograniczenie release

Fixture Chromium 4× jest powtarzalną bramką syntetyczną, ale nie zastępuje
trace'a oraz heap snapshotu z rzeczywistego słabszego komputera w Margonem.
Zgodnie z założeniem planu ten pomiar pozostaje końcową bramką przed wydaniem.
