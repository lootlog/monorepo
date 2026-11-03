import { describe, expect, it } from "bun:test";
import {
  parseHeroDetectorMessage,
  resolveHeroSightingTransition,
  upsertNewestHeroSighting,
} from "./hero-sightings.js";

describe("detector answers from Margonem", () => {
  it("reads a roaming hero from a multi-part map name", () => {
    expect(
      parseHeroDetectorMessage(
        "[b]Tepeyollotl (258b)[/b] grasuje w: Oztotl Tzacua p.2 - sala 2",
      ),
    ).toEqual({
      heroName: "Tepeyollotl",
      heroLvl: 258,
      heroProf: "BLADE_DANCER",
      state: "ROAMING",
      mapName: "Oztotl Tzacua p.2 - sala 2",
    });
  });

  it("reads a pending spawn of a hero with a multi-word name", () => {
    expect(
      parseHeroDetectorMessage(
        "[b]Negthotep Czarny Kapłan (271h)[/b] pojawi się w: Pustynne Katakumby - Komnata Opętanych Dusz",
      ),
    ).toMatchObject({
      heroName: "Negthotep Czarny Kapłan",
      heroLvl: 271,
      state: "SPAWNING",
      mapName: "Pustynne Katakumby - Komnata Opętanych Dusz",
    });
  });

  it.each([
    [
      "Insane Orc Hunter (165w) roves in: Red Orc Village",
      {
        heroName: "Insane Orc Hunter",
        heroLvl: 165,
        state: "ROAMING",
        mapName: "Red Orc Village",
      },
    ],
    [
      "[b]Hellish Skeletor (85w)[/b] will appear in: Treacherous Passage - 2nd Level",
      {
        heroName: "Hellish Skeletor",
        heroLvl: 85,
        state: "SPAWNING",
        mapName: "Treacherous Passage - 2nd Level",
      },
    ],
  ])("reads an answer from the English game: %s", (message, detection) => {
    expect(parseHeroDetectorMessage(message)).toMatchObject({
      ...detection,
      heroProf: "WARRIOR",
    });
  });

  it.each([
    "Podział łupów: Tepeyollotl (258b)",
    "[b]Tepeyollotl (258b)[/b] zginął w: Skały Umarłych",
  ])("ignores other system messages: %s", (message) => {
    expect(parseHeroDetectorMessage(message)).toBeNull();
  });
});

describe("how a detection changes the current sighting", () => {
  const roamingAt = (mapName: string, lastSeenAt: number) => ({
    state: "ROAMING" as const,
    mapName,
    lastSeenAt,
  });

  const spawningAt = (mapName: string, lastSeenAt: number) => ({
    state: "SPAWNING" as const,
    mapName,
    lastSeenAt,
  });

  it("keeps a pending spawn and its claims when the hero appears there", () => {
    expect(
      resolveHeroSightingTransition(spawningAt("Skały Umarłych", 100), {
        state: "ROAMING",
        mapName: "Skały Umarłych",
        observedAt: 200,
      }),
    ).toBe("SPAWNED");
  });

  it("infers a kill when a roaming hero is later due to spawn on the same map", () => {
    expect(
      resolveHeroSightingTransition(roamingAt("Skały Umarłych", 100), {
        state: "SPAWNING",
        mapName: "Skały Umarłych",
        observedAt: 200,
      }),
    ).toBe("REPLACE");
  });

  it("infers a kill when a hero is seen on another map", () => {
    expect(
      resolveHeroSightingTransition(roamingAt("Skały Umarłych", 100), {
        state: "ROAMING",
        mapName: "Potępione Zamczysko",
        observedAt: 200,
      }),
    ).toBe("REPLACE");
  });

  it("does not let a delayed older detection overwrite newer knowledge", () => {
    expect(
      resolveHeroSightingTransition(roamingAt("Skały Umarłych", 200), {
        state: "SPAWNING",
        mapName: "Potępione Zamczysko",
        observedAt: 100,
      }),
    ).toBe("STALE");
  });

  it("confirms a repeated detection, even a delayed one", () => {
    expect(
      resolveHeroSightingTransition(spawningAt("Skały Umarłych", 200), {
        state: "SPAWNING",
        mapName: "Skały Umarłych",
        observedAt: 100,
      }),
    ).toBe("CONFIRM");
  });
});

describe("keeping the newest sighting of each hero", () => {
  const sighting = (id: number, world: string) => ({
    id,
    guildId: "organization",
    world,
    hero: { key: "tepeyollotl" },
  });

  it("keeps the same hero apart on different worlds", () => {
    expect(
      upsertNewestHeroSighting([sighting(1, "jaruna")], sighting(2, "fobos")),
    ).toEqual([sighting(1, "jaruna"), sighting(2, "fobos")]);
  });

  it("ignores a late update of the sighting a newer one replaced", () => {
    const current = [sighting(2, "jaruna")];

    expect(upsertNewestHeroSighting(current, sighting(1, "jaruna"))).toBe(
      current,
    );
  });
});
