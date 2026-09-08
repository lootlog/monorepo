import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { CreateGroupFightRequest } from "./schemas.js";

const decode = Schema.decodeUnknownSync(CreateGroupFightRequest);
const payload = {
  world: "classic",
  accountId: "10",
  characterId: "1",
  submissionKey: "submission",
  map: { id: 1, pvp: 2, name: "Sala Tronowa" },
  qualification: { source: "CATALOG" },
  startedAt: "2026-09-06T10:00:00.000Z",
  endedAt: "2026-09-06T10:00:30.000Z",
  myTeam: 1,
  winningTeam: null,
  participants: [1, 2, 3, 4].map((id) => ({
    characterId: String(id),
    accountId: id === 1 ? "10" : null,
    name: `Player${id}`,
    lvl: 100,
    prof: "w",
    icon: "",
    team: id <= 2 ? 1 : 2,
    joinedAt: "2026-09-06T10:00:00.000Z",
    fled: false,
  })),
};
describe("group fight ingress contract", () => {
  it("accepts pure 2v2 on a catalog red map", () =>
    expect(decode(payload).participants).toHaveLength(4));
  it.each([
    [2, 1],
    [10, 1],
    [1, 10],
    [8, 8],
    [10, 9],
  ])("accepts %sv%s for organization-level filtering", (teamOne, teamTwo) => {
    const participants = Array.from(
      { length: teamOne + teamTwo },
      (_, index) => ({
        ...payload.participants[0],
        characterId: String(index + 1),
        team: index < teamOne ? 1 : 2,
      }),
    );
    expect(decode({ ...payload, participants }).participants).toHaveLength(
      teamOne + teamTwo,
    );
  });
  it("rejects 1v1", () => {
    expect(() =>
      decode({
        ...payload,
        participants: [payload.participants[0], payload.participants[2]],
      }),
    ).toThrow();
  });
  it("rejects NPCs, duplicate characters, missing submitter and empty teams", () => {
    for (const participants of [
      payload.participants.map((p, i) =>
        i === 3 ? { ...p, characterId: "-4" } : p,
      ),
      [...payload.participants.slice(0, 3), payload.participants[0]],
      payload.participants.map((p) => ({
        ...p,
        characterId: `${p.characterId}0`,
      })),
      payload.participants.map((p) => ({ ...p, team: 1 })),
    ])
      expect(() => decode({ ...payload, participants })).toThrow();
  });
  it("rejects non-red or unqualified maps and late joins after ending", () => {
    for (const map of [
      { ...payload.map, pvp: 0 },
      { ...payload.map, name: "Ithan" },
    ])
      expect(() => decode({ ...payload, map })).toThrow();
    expect(() =>
      decode({
        ...payload,
        participants: payload.participants.map((p) => ({
          ...p,
          joinedAt: "2026-09-06T11:00:00.000Z",
        })),
      }),
    ).toThrow();
  });
  it("accepts an observed titan on another red map, but rejects a hero", () => {
    const observed = {
      ...payload,
      map: { ...payload.map, name: "Other map" },
      qualification: {
        source: "NPC_OBSERVED",
        npc: { id: 3, name: "Titan", wt: 100 },
      },
    };
    expect(decode(observed).qualification.source).toBe("NPC_OBSERVED");
    expect(() =>
      decode({
        ...observed,
        qualification: {
          ...observed.qualification,
          npc: { ...observed.qualification.npc, wt: 80 },
        },
      }),
    ).toThrow();
  });
});
