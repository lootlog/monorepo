# Kompaktowe karty presetów wyglądu Chatu

## Cel

Zmniejszyć wysokość kart „Czytelny” i „Kompaktowy”, układać je obok siebie
zawsze, gdy pozwala na to faktyczna szerokość sekcji, oraz zastąpić dekoracyjne
paski wiernym podglądem wpisów Chatu.

## Projekt

### Responsywny układ

- Kontener presetów używa siatki dopasowanej do własnej szerokości, a nie
  breakpointu całego okna.
- Siatka używa dokładnie
  `repeat(auto-fit, minmax(min(100%, 9rem), 1fr))` oraz odstępu 8 px.
- Dwie kolumny powstają od 296 px dostępnej szerokości
  (`2 × 144 px + 8 px`). Poniżej 296 px siatka przechodzi do jednej kolumny,
  a wewnętrzne `min(100%, 9rem)` zapobiega poziomemu overflow.
- Karty tracą obecną minimalną wysokość 96 px. Używają paddingu 8 px, odstępu
  6 px między głównymi blokami i paddingu 6 px wewnątrz miniatury, zachowując
  pełny obszar klikalny.

### Wierny podgląd

- Z produkcyjnych wpisów Chatu zostaje wydzielona czysta warstwa prezentacyjna
  gracza i NPC.
- Produkcyjny Chat nadal opakowuje tę warstwę w menu kontekstowe, tooltipy,
  edycję i akcje.
- Karty presetów używają tej samej warstwy prezentacyjnej z bezpiecznymi danymi
  przykładowymi i bez interakcji.
- „Czytelny” pokazuje wpis gracza oraz NPC w układzie tile.
- „Kompaktowy” pokazuje te same dane w gęstszym układzie inline.
- Podgląd respektuje rzeczywiste zmienne gęstości, typografię, odstępy,
  metadane oraz bieżącą globalną paletę NPC użytkownika. Kolory NPC nie należą
  do presetów.
- `ChatAppearanceSettingsForm` pobiera `npcTypeColors` raz i przekazuje tę samą
  paletę do obu miniatur oraz dużego preview. Komponenty prezentacyjne nie
  odczytują dokumentów ustawień samodzielnie.

### Zachowanie

- Cała karta pozostaje przyciskiem z `aria-pressed`.
- Kliknięcie, Enter i Spacja wybierają preset tak jak obecnie.
- Zaznaczenie nadal pokazuje fioletowe obramowanie, tło i ikonę wyboru.
- Zapis presetów, status zapisu i obsługa ustawień własnych nie zmieniają się.
- Miniatury mają `aria-hidden` i nie przechwytują wskaźnika ani fokusu.
- W miniaturach nie mogą powstać interaktywne ani fokusowalne elementy
  potomne.

## Podział komponentów

- `ChatAppearancePresetCard` odpowiada wyłącznie za przycisk, etykiety, stan
  zaznaczenia i osadzenie miniatury.
- `ChatAppearancePresetMiniPreview` przyjmuje wyłącznie
  `settings: ChatAppearanceSettings` i `npcTypeColors: NpcTypeColors`,
  przygotowuje deterministyczne dane przykładowe i składa wpis gracza z wpisem
  NPC.
- `ChatPlayerMessageView` przejmuje z `chat-message.tsx` wyłącznie wizualny
  kontener zwykłego, nieedytowanego wpisu: metadane czasu i gildii, miejsce
  nadawcy oraz typografię treści. Przyjmuje `appearance`, `all`, `guildName`,
  `messageId`, `timestamp`, `isMsgYesterday`, `sender` i `body`; `sender` oraz
  `body` są pasywnymi węzłami React przygotowanymi przez rodzica.
- `ChatNpcMessageView` przejmuje z `chat-npc-message.tsx` wizualny kontener
  wpisu NPC: metadane, tile/inline, avatar, nazwę, poziom, lokalizację i liczniki.
  Przyjmuje `appearance`, `all`, `guildName`, `message`, `npcTypeColors`,
  `memberColor`, `senderName`, `count` i `additionalSenderCount`.
- `ChatMessage` zachowuje parsowanie treści i mentionów, odpowiedzi, edycję,
  menu kontekstowe, tooltip nadawcy, akcje, hooki gry oraz mutacje. Dla zwykłego
  nieedytowanego wpisu przekazuje gotowy `sender` i `body` do
  `ChatPlayerMessageView`.
- `ChatNpcMessage` zachowuje `useMemberColor` i tooltip nadawcy, a wyliczone
  wartości przekazuje do `ChatNpcMessageView`.
- Czyste widoki nie wykonują zapytań, mutacji, odczytów store ani operacji na
  stanie gry.
- Każdy komponent pozostaje w osobnym pliku zgodnie z zasadami repozytorium.

## Testy

- Kontrakt siatki zawiera dokładne minimum 144 px i odstęp 8 px; test
  przeglądarkowy potwierdza dwie kolumny przy 296 px oraz jedną kolumnę bez
  overflow przy 295 px i przy minimalnej wspieranej szerokości Settings.
- Karty nie mają starej minimalnej wysokości i zachowują dostępne stany wyboru.
- Oba presety renderują rzeczywisty wpis gracza oraz NPC zamiast abstrakcyjnych
  pasków.
- Podglądy pokazują odpowiednio tile i inline oraz używają właściwej gęstości.
- Miniatury są nieinteraktywne i ukryte przed technologiami asystującymi.
- Dane przykładowe mają stały timestamp i identyfikatory. Render miniatur nie
  uruchamia zapytań, mutacji, akcji gry ani produkcyjnych menu i tooltipów.
- Osobne testy `ChatPlayerMessageView` oraz `ChatNpcMessageView` pokrywają
  mapowanie ich publicznych propsów na metadane, treść i wariant tile/inline.
- Produkcyjny Chat nadal renderuje te same wizualne komponenty bez regresji
  menu, odpowiedzi, edycji i wpisów NPC.
- Uruchomić testy Settings i Chatu, typecheck oraz lint game-clienta.

## Poza zakresem

- Zmiana wartości presetów, API lub persystencji.
- Przebudowa dużego, sticky preview po prawej stronie.
- Dodawanie trzeciego presetu.
