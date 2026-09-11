import { describe, expect, it } from "vitest";
import {
  findSearchMatchRanges,
  searchSettings,
  type SettingsSearchItem,
} from "./settings-search";

const searchItems: SettingsSearchItem[] = [
  {
    categoryId: "chat",
    categoryLabel: "Chat",
    subsectionId: "chat-appearance",
    subsectionLabel: "Chat",
    controlId: "chat-message-gap",
    label: "Odstęp wiadomości",
    description: "Zmień przestrzeń między wpisami.",
    keywords: ["gap", "margines"],
    order: 0,
  },
  {
    categoryId: "notifications",
    categoryLabel: "Powiadomienia",
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

  it("allows two typos in a long word but none in a short one", () => {
    expect(searchSettings(searchItems, "wiadomsoci")).toEqual([searchItems[0]]);
    expect(searchSettings(searchItems, "gpa")).toEqual([]);
  });

  it("requires every word of a multi-word query to match, across fields", () => {
    expect(searchSettings(searchItems, "routing gildii")).toEqual([
      searchItems[1],
    ]);
    expect(searchSettings(searchItems, "routing wiadomosci")).toEqual([]);
  });

  it("ranks a label hit above a description-only hit", () => {
    const descriptionOnly: SettingsSearchItem = {
      ...searchItems[1],
      controlId: "detector-types",
      label: "Typy potworów",
      description: "Wybierz, o których NPC ma powiadamiać routing.",
      order: 0,
    };

    expect(
      searchSettings([descriptionOnly, searchItems[1]], "routing").map(
        (item) => item.controlId,
      ),
    ).toEqual(["detector-routing", "detector-types"]);
  });

  it("reports the matched ranges of a label ignoring diacritics", () => {
    expect(findSearchMatchRanges("Odstęp wiadomości", "odstep wiad")).toEqual([
      { start: 0, end: 6 },
      { start: 7, end: 11 },
    ]);
  });
});
