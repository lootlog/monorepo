import { describe, expect, it } from "vitest";
import { searchSettings, type SettingsSearchItem } from "./settings-search";

const searchItems: SettingsSearchItem[] = [
  {
    categoryId: "appearance",
    categoryLabel: "Wygląd",
    subsectionId: "chat",
    subsectionLabel: "Chat",
    controlId: "chat-message-gap",
    label: "Odstęp wiadomości",
    description: "Zmień przestrzeń między wpisami.",
    keywords: ["gap", "margines"],
    order: 0,
  },
  {
    categoryId: "game-data",
    categoryLabel: "Dane z gry",
    subsectionId: "detector",
    subsectionLabel: "Wykrywacz NPC",
    controlId: "detector-routing",
    label: "Routing na serwery",
    description: "Wysyłaj znalezione NPC do wybranych gildii.",
    keywords: ["discord"],
    order: 1,
  },
];

describe("searchSettings", () => {
  it("matches Polish labels without requiring diacritics", () => {
    expect(searchSettings(searchItems, "odstep")).toEqual([searchItems[0]]);
  });

  it("tolerates one transposed character in a long token", () => {
    expect(searchSettings(searchItems, "odstpe")).toEqual([searchItems[0]]);
  });

  it("matches explicit aliases and preserves manifest order for ties", () => {
    expect(searchSettings(searchItems, "discord")).toEqual([searchItems[1]]);
  });
});
