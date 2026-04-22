import { describe, expect, it } from "vitest";
import {
  getMemberLootlogConfigMetadataTranslationKey,
  getMemberLootlogProfileTarget,
} from "./member-lootlog-config.utils";

describe("getMemberLootlogConfigMetadataTranslationKey", () => {
  it("returns null for resolved entries", () => {
    expect(getMemberLootlogConfigMetadataTranslationKey("resolved")).toBeNull();
  });

  it("maps missing snapshot to a user-facing translation key", () => {
    expect(
      getMemberLootlogConfigMetadataTranslationKey("missing_snapshot"),
    ).toBe("settings.members.lootlogMissingSnapshot");
  });

  it("maps invalid character refs to a user-facing translation key", () => {
    expect(
      getMemberLootlogConfigMetadataTranslationKey("invalid_character_ref"),
    ).toBe("settings.members.lootlogInvalidCharacterRef");
  });
});

describe("getMemberLootlogProfileTarget", () => {
  it("returns a Margonem profile target for valid ids and world", () => {
    expect(
      getMemberLootlogProfileTarget({
        accountId: "123",
        characterId: "456",
        world: "Berufs",
      }),
    ).toEqual({
      accountId: 123,
      characterId: 456,
      href: "https://www.margonem.pl/profile/view,123#char_456,Berufs",
      world: "Berufs",
    });
  });

  it("returns null when the character ref is invalid", () => {
    expect(
      getMemberLootlogProfileTarget({
        accountId: "abc",
        characterId: "456",
        world: "Berufs",
      }),
    ).toBeNull();
  });

  it("returns null when the world is missing", () => {
    expect(
      getMemberLootlogProfileTarget({
        accountId: "123",
        characterId: "456",
        world: null,
      }),
    ).toBeNull();
  });
});
