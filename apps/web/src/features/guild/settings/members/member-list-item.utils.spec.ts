import { describe, expect, it } from "vitest";
import type { MemberResponseDto as GuildMember } from "@lootlog/api-client/models/main/member-response-dto";
import {
  compareMemberListSortValues,
  getMemberAccessState,
  getMemberListItemClassName,
  getMemberOnlineSources,
  memberMatchesSearch,
  memberMatchesStatusFilter,
} from "./member-list-item.utils";

const createMember = (overrides: Partial<GuildMember> = {}): GuildMember => ({
  id: 1,
  userId: "123456789",
  guildId: "guild-id",
  type: "USER",
  name: "Widu",
  active: true,
  roles: [],
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("member list item utils", () => {
  it("uses green border classes for online members", () => {
    const className = getMemberListItemClassName({
      isOnline: true,
      isActive: true,
    });

    expect(className).toContain("border-emerald-500/50");
    expect(className).toContain("shadow-emerald-500/10");
    expect(className).not.toContain("opacity-50");
  });

  it("keeps inactive opacity without online border for offline members", () => {
    const className = getMemberListItemClassName({
      isOnline: false,
      isActive: false,
    });

    expect(className).not.toContain("border-emerald-500/50");
    expect(className).toContain("opacity-50");
  });

  it("returns no online sources for offline members", () => {
    expect(
      getMemberOnlineSources({
        isOnlineOnWeb: false,
        isOnlineInGame: false,
      }),
    ).toEqual([]);
  });

  it("returns web source for web online members", () => {
    expect(
      getMemberOnlineSources({
        isOnlineOnWeb: true,
        isOnlineInGame: false,
      }),
    ).toEqual(["web"]);
  });

  it("returns game source for game online members", () => {
    expect(
      getMemberOnlineSources({
        isOnlineOnWeb: false,
        isOnlineInGame: true,
      }),
    ).toEqual(["game"]);
  });

  it("returns both online sources for web and game online members", () => {
    expect(
      getMemberOnlineSources({
        isOnlineOnWeb: true,
        isOnlineInGame: true,
      }),
    ).toEqual(["web", "game"]);
  });

  it("matches search by member name and Discord ID", () => {
    const member = createMember();

    expect(memberMatchesSearch({ member, search: "wid" })).toBe(true);
    expect(memberMatchesSearch({ member, search: "456" })).toBe(true);
    expect(memberMatchesSearch({ member, search: "other" })).toBe(false);
  });

  it("filters active, inactive, online and problematic members", () => {
    const activeMember = createMember();
    const inactiveMember = createMember({ active: false });
    const problematicMember = createMember({ refreshQueued: true });

    expect(
      memberMatchesStatusFilter({
        member: activeMember,
        filter: "active",
        isOnline: false,
      }),
    ).toBe(true);
    expect(
      memberMatchesStatusFilter({
        member: inactiveMember,
        filter: "inactive",
        isOnline: false,
      }),
    ).toBe(true);
    expect(
      memberMatchesStatusFilter({
        member: activeMember,
        filter: "online",
        isOnline: true,
      }),
    ).toBe(true);
    expect(
      memberMatchesStatusFilter({
        member: problematicMember,
        filter: "problems",
        isOnline: false,
      }),
    ).toBe(true);
  });

  it("prioritizes inactive before problem and online access labels", () => {
    expect(
      getMemberAccessState({
        member: createMember({ active: false, refreshQueued: true }),
        isOnline: true,
      }),
    ).toBe("inactive");
    expect(
      getMemberAccessState({
        member: createMember({ refreshQueued: true }),
        isOnline: true,
      }),
    ).toBe("problem");
    expect(
      getMemberAccessState({
        member: createMember(),
        isOnline: true,
      }),
    ).toBe("online");
  });

  it("sorts members by role position and then alphabetically", () => {
    const sortedNames = [
      {
        rolePosition: 20,
        name: "Zenon",
      },
      {
        rolePosition: 40,
        name: "Beta",
      },
      {
        rolePosition: 40,
        name: "Adam",
      },
      {
        rolePosition: 0,
        name: "No role",
      },
    ]
      .sort(compareMemberListSortValues)
      .map((item) => item.name);

    expect(sortedNames).toEqual(["Adam", "Beta", "Zenon", "No role"]);
  });
});
