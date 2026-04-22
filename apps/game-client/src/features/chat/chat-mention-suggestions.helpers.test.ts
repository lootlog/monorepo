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

  it("limits suggestions to five roles and five members", () => {
    expect(
      getChatMentionSuggestions({
        roleSuggestions: getChatMentionRoleSuggestions([
          {
            id: "role-1",
            guildId: "guild-1",
            name: "Role Alpha",
            color: null,
            permissions: [],
          },
          {
            id: "role-2",
            guildId: "guild-1",
            name: "Role Beta",
            color: null,
            permissions: [],
          },
          {
            id: "role-3",
            guildId: "guild-1",
            name: "Role Gamma",
            color: null,
            permissions: [],
          },
          {
            id: "role-4",
            guildId: "guild-1",
            name: "Role Delta",
            color: null,
            permissions: [],
          },
          {
            id: "role-5",
            guildId: "guild-1",
            name: "Role Epsilon",
            color: null,
            permissions: [],
          },
          {
            id: "role-6",
            guildId: "guild-1",
            name: "Role Zeta",
            color: null,
            permissions: [],
          },
        ]),
        memberSuggestions: getChatMentionMemberSuggestions([
          {
            id: 1,
            userId: "user-1",
            name: "Member Alpha",
            color: null,
          },
          {
            id: 2,
            userId: "user-2",
            name: "Member Beta",
            color: null,
          },
          {
            id: 3,
            userId: "user-3",
            name: "Member Gamma",
            color: null,
          },
          {
            id: 4,
            userId: "user-4",
            name: "Member Delta",
            color: null,
          },
          {
            id: 5,
            userId: "user-5",
            name: "Member Epsilon",
            color: null,
          },
          {
            id: 6,
            userId: "user-6",
            name: "Member Zeta",
            color: null,
          },
        ]),
        query: "",
      }),
    ).toHaveLength(10);
  });

  it("returns an empty member suggestion list for non-array runtime input", () => {
    expect(
      getChatMentionMemberSuggestions("broken" as unknown as never[]),
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
