import { describe, expect, it } from "vitest";
import {
  applyChatMentionSuggestion,
  getActiveChatMention,
  getChatMentionMemberSuggestions,
  getChatMentionRoleSuggestions,
  getChatMentionSuggestionDisplayLabel,
  getChatMentionSuggestions,
} from "./chat-mention-suggestions.helpers";

describe("chat mention suggestions helpers", () => {
  it("detects the active mention at the current caret position", () => {
    expect(
      getActiveChatMention({
        message: "hej @Raid Team ruszajcie",
        caretIndex: "hej @Raid".length,
      }),
    ).toEqual({
      start: 4,
      end: 9,
      query: "Raid",
    });
  });

  it("ignores @ tokens without a valid mention boundary", () => {
    expect(
      getActiveChatMention({
        message: "hej@Hero",
        caretIndex: "hej@He".length,
      }),
    ).toBeNull();

    expect(
      getActiveChatMention({
        message: "hej @Hero!",
        caretIndex: "hej @Hero!".length,
      }),
    ).toBeNull();
  });

  it("builds grouped suggestions with role priority and deduplicates names", () => {
    expect(
      getChatMentionSuggestions({
        roleSuggestions: getChatMentionRoleSuggestions([
          {
            id: "role-1",
            guildId: "guild-1",
            name: "Raid Team",
            color: 0xff8800,
            permissions: [],
          },
          {
            id: "role-2",
            guildId: "guild-1",
            name: "Support",
            color: null,
            permissions: [],
          },
        ]),
        memberSuggestions: getChatMentionMemberSuggestions([
          {
            id: 1,
            userId: "user-1",
            name: "Raider",
            color: 0x12ab34,
          },
          {
            id: 2,
            userId: "user-2",
            name: "raid team",
            color: null,
          },
          {
            id: 3,
            userId: "user-3",
            name: "Hero",
            color: null,
          },
        ]),
        query: "ra",
      }),
    ).toEqual([
      {
        kind: "role",
        label: "Raid Team",
        normalizedLabel: "raid team",
        color: "ff8800",
      },
      {
        kind: "member",
        label: "Raider",
        normalizedLabel: "raider",
        color: "12ab34",
      },
    ]);
  });

  it("returns an empty member suggestion list for non-array runtime input", () => {
    expect(
      // @ts-expect-error Intentionally malformed runtime input exercises the non-array fallback.
      getChatMentionMemberSuggestions("broken"),
    ).toEqual([]);
  });

  it("does not mutate role suggestions while sorting", () => {
    const roleSuggestions = getChatMentionRoleSuggestions([
      {
        id: "role-1",
        guildId: "guild-1",
        name: "Zulu",
        color: null,
        permissions: [],
      },
      {
        id: "role-2",
        guildId: "guild-1",
        name: "Alpha",
        color: null,
        permissions: [],
      },
    ]);

    expect(
      getChatMentionSuggestions({
        roleSuggestions,
        memberSuggestions: [],
        query: "",
      }),
    ).toEqual([
      expect.objectContaining({ label: "Alpha" }),
      expect.objectContaining({ label: "Zulu" }),
    ]);
    expect(roleSuggestions.map((suggestion) => suggestion.label)).toEqual([
      "Zulu",
      "Alpha",
    ]);
  });

  it("replaces the full active token and keeps the caret after the inserted mention", () => {
    expect(
      applyChatMentionSuggestion({
        message: "hej @Herox i ruszamy",
        mention: {
          start: 4,
          end: 10,
          query: "Hero",
        },
        suggestion: {
          kind: "member",
          label: "Hero",
          normalizedLabel: "hero",
          color: "12ab34",
        },
      }),
    ).toEqual({
      nextMessage: "hej @Hero i ruszamy",
      nextCaretIndex: 10,
    });
  });

  it("does not add a second prefix for labels that already start with @", () => {
    expect(
      getChatMentionSuggestionDisplayLabel({
        label: "@everyone",
      }),
    ).toBe("@everyone");

    expect(
      applyChatMentionSuggestion({
        message: "hej @ev",
        mention: {
          start: 4,
          end: 7,
          query: "ev",
        },
        suggestion: {
          kind: "role",
          label: "@everyone",
          normalizedLabel: "@everyone",
          color: null,
        },
      }),
    ).toEqual({
      nextMessage: "hej @everyone ",
      nextCaretIndex: 14,
    });
  });
});
