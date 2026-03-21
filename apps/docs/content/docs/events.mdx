---
title: Eventy klanowe
description: Organizuj polowania na herosów eventowych, śledź pokrycie map i zarządzaj rankingami uczestników
---

## Co to są Eventy?

Eventy klanowe to system koordynacji polowań na sezonowych herosów w Margonem. Pozwalają klanowi zorganizować śledzenie respawnów, przypisywać członków do map i nagradzać uczestników punktami.

### Hierarchia systemu

- **Event** - główny kontener (np. "Gwiazdka 2025")
- **Heros** - boss eventowy (np. "Anielska zabójczyni")
- **Mapy** - lokalizacje spawnu herosa
- **Lokacje** - opcjonalne grupowanie map (np. "Driady")

### Główne funkcje

- Śledzenie obecności członków na mapach w czasie rzeczywistym
- Automatyczne naliczanie punktów za udział w biciu herosa
- Rankingi uczestników per heros
- Historia wszystkich bić z informacją o uczestnikach

## Uprawnienia

Dostęp do eventów kontrolują dedykowane uprawnienia:

| Uprawnienie             | Opis                                                                   |
| ----------------------- | ---------------------------------------------------------------------- |
| `LOOTLOG_EVENTS_READ`   | Przeglądanie eventów, herosów, map i rankingów                         |
| `LOOTLOG_EVENTS_WRITE`  | Samodzielne przypisywanie się do map                                   |
| `LOOTLOG_EVENTS_MANAGE` | Tworzenie eventów, zarządzanie herosami i mapami, przypisywanie innych |

> **Konfiguracja uprawnień:** Uprawnienia eventowe konfigurujesz w ustawieniach klanu → Role → wybrana rola → sekcja "Eventy".

### Edycja punktów

Ręczna edycja punktów w rankingu wymaga roli **Owner** lub **Admin** klanu. Historia wszystkich edycji jest zapisywana.

## Tworzenie eventu

Aby utworzyć nowy event, potrzebujesz uprawnienia `EVENTS_MANAGE`.

### Wymagane pola

- **Nazwa eventu** - np. "Gwiazdka 2025"
- **Świat** - nazwa serwera, np. "gordion"

### Opcjonalne pola

- **Data rozpoczęcia** - kiedy event się zaczyna
- **Data zakończenia** - kiedy event się kończy

> **Daty są opcjonalne.** Możesz utworzyć event bez dat i ustawić je później w edycji.

Po utworzeniu eventu możesz dodawać do niego herosów.

## Zarządzanie herosami i mapami

### Dodawanie herosa

Każdy heros eventowy wymaga:

- **Nazwa herosa** - musi być dokładna dla automatycznego wykrywania bić

Opcjonalnie:

- **ID NPC** - identyfikator z gry (np. z URL potwora)

> **Automatyczne wykrywanie ID:** Jeśli nie znasz ID herosa, zostaw pole puste. System automatycznie wykryje ID po pierwszym zbiciu herosa (wymaga poprawnej nazwy).

### Dodawanie map

Po utworzeniu herosa możesz dodać mapy jego spawnu:

1. **Wyszukiwanie** - wpisz nazwę lub ID mapy
2. **Szablony** - załaduj predefiniowany zestaw map z szablonu

### Lokacje

Lokacje pozwalają grupować mapy dla lepszej organizacji (np. "Las Północny", "Pustynie"). Są opcjonalne - możesz używać map bez lokacji.

## System punktacji

Punkty za udział w biciu herosa obliczane są według formuły:

```
Punkty = Bazowe × Pora dnia × Tropiciele × Mapy
```

### Punkty bazowe

Podstawowa liczba punktów za bicie. Możesz ją zmienić w ustawieniach herosa.

> **Przeliczanie historii:** Zmiana punktów bazowych automatycznie przeliczy punkty dla wszystkich historycznych bić.

### Mnożnik pory dnia

Dodatkowe punkty za obecność o określonych porach. Konfiguracja pozwala ustawić przedziały czasowe i ich mnożniki, np.:

- 00:00 - 06:00 → mnożnik 1.5x (noc)
- 06:00 - 22:00 → mnożnik 1.0x (dzień)
- 22:00 - 00:00 → mnożnik 1.2x (wieczór)

### Mnożnik obstawiających

Im mniej osób obstawia herosa, tym większy mnożnik dla każdego uczestnika. Przykładowa konfiguracja:

- 1-3 osoby → mnożnik 2.0x
- 4-6 osób → mnożnik 1.5x
- 7+ osób → mnożnik 1.0x

### Mnożnik map

Bonus za obstawianie wielu map jednocześnie. Przykładowa konfiguracja:

- 1-5 map → mnożnik 1.0x
- 6-10 map → mnożnik 1.2x
- 11+ map → mnożnik 1.5x

## Przypisywanie do map

### Samodzielne przypisywanie

Członkowie z uprawnieniem `EVENTS_WRITE` mogą sami przypisywać się do map. Wystarczy kliknąć "Przypisz się" na wybranej mapie.

### Przypisywanie przez moderatora

Członkowie z uprawnieniem `EVENTS_MANAGE` mogą przypisywać innych członków do map.

### Timeout przed respawnem

Parametr `assignmentTimeoutMinutes` określa ile minut przed minimalnym czasem respawnu można się przypisać do mapy. Zapobiega to zbyt wczesnemu zajmowaniu map.

### Limit osób na mapie

Parametr `mapAssignmentCap` określa maksymalną liczbę osób na jednej mapie. Wartość 0 oznacza brak limitu.

### Statusy map

Każda mapa może mieć jeden z statusów:

| Status            | Znaczenie                            |
| ----------------- | ------------------------------------ |
| **Monitoruje**    | Przypisany członek jest na mapie     |
| **Nieobecny**     | Przypisany członek nie jest na mapie |
| **AFK**           | Przypisany członek jest AFK          |
| **Nieprzypisany** | Nikt nie jest przypisany do mapy     |

### Luki w pokryciu

System pokazuje mapy z lukami:

- **Nieprzypisana** - mapa nie ma przypisanego członka
- **Nieobstawiona** - mapa ma przypisanego członka, ale nie jest on na niej obecny

## Okna odrodzenia

Okno odrodzenia (respawnu) określa przedział czasowy, w którym heros może się pojawić.

### Statusy okna

| Status           | Znaczenie                                   |
| ---------------- | ------------------------------------------- |
| **Okno otwarte** | Heros może się pojawić w każdej chwili      |
| **Oczekiwanie**  | Okno zostanie otwarte o określonej godzinie |
| **Brak okna**    | Nie ma aktywnego okna respawnu              |

### Otwieranie okna

Aby otworzyć okno respawnu:

1. Przejdź do widoku herosa
2. Kliknij "Otwórz okno respawnu"
3. Ustaw minimalny i maksymalny czas spawnu

### Zamykanie okna

Okno można zamknąć ręcznie lub zostanie zamknięte automatycznie:

- **Automatycznie** - po przekroczeniu maksymalnego czasu respawnu
- **Ręcznie** - moderator może zamknąć okno przyciskiem "Zamknij okno"

> **Po biciu herosa:** System automatycznie zamyka okno, czyści przypisania do map i nalicza punkty uczestnikom.

## Rankingi

### Przeglądanie rankingu

Ranking pokazuje punkty i liczbę bić dla każdego uczestnika danego herosa. Dostępny dla wszystkich z uprawnieniem `EVENTS_READ`.

### Edycja punktów

Właściciele klanu (Owner) i administratorzy (Admin) mogą ręcznie edytować punkty w rankingu. Każda edycja jest zapisywana w historii wraz z informacją kto i kiedy ją wykonał.

### Historia edycji

System przechowuje pełną historię zmian punktów, zarówno automatycznych (po biciu) jak i ręcznych (edycja przez admina).
