import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import {
  type CommandSuggestion,
  filterCommandSuggestions,
  getCommandSuggestionInsertValue,
  getCommandSuggestions,
  isCommandSuggestionsInput,
} from "./command-suggestions.helpers";

const translateCommand = ((key: string) => key) as TFunction<"command">;

describe("command-suggestions.helpers", () => {
  it("opens suggestions only for slash-prefixed input", () => {
    expect(isCommandSuggestionsInput("/")).toBe(true);
    expect(isCommandSuggestionsInput("/g")).toBe(true);
    expect(isCommandSuggestionsInput("!g")).toBe(false);
    expect(isCommandSuggestionsInput("hello")).toBe(false);
  });

  it("returns slash commands and excludes clear chat by default", () => {
    const suggestions = getCommandSuggestions(translateCommand);

    expect(suggestions).toEqual([
      {
        prefix: "/grp",
        label: "suggestions.partySearchLabel",
        description: "suggestions.partySearchDescription",
      },
    ]);
  });

  it("optionally includes the clear chat slash command", () => {
    const suggestions = getCommandSuggestions(translateCommand, {
      includeClearChatCommand: true,
    });

    expect(suggestions).toContainEqual({
      prefix: "/clr",
      label: "suggestions.clearChatLabel",
      description: "suggestions.clearChatDescription",
    });
  });

  it("filters and inserts slash commands with trailing space", () => {
    const filteredSuggestions = filterCommandSuggestions({
      inputValue: "/g",
      suggestions: getCommandSuggestions(translateCommand, {
        includeClearChatCommand: true,
      }),
    });

    expect(filteredSuggestions).toEqual([
      {
        prefix: "/grp",
        label: "suggestions.partySearchLabel",
        description: "suggestions.partySearchDescription",
      },
    ]);
    expect(getCommandSuggestionInsertValue(filteredSuggestions[0]!)).toBe(
      "/grp ",
    );
  });

  it("returns an empty list for non-array runtime input", () => {
    expect(
      filterCommandSuggestions({
        inputValue: "/g",
        suggestions: "broken" as unknown as CommandSuggestion[],
      }),
    ).toEqual([]);
  });
});
