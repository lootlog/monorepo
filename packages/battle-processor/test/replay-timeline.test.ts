import { describe, expect, it } from "bun:test";
import { parseBattleMoves } from "../src/battle-log.js";
import {
  buildReplayTimeline,
  getReplayStateAtTime,
  type ReplayBattleInput,
} from "../src/replay-timeline.js";
import { duel } from "./battle-processor.fixtures.js";

const buildSampleInput = (
  moves: string[],
  overrides: Partial<ReplayBattleInput> = {},
): ReplayBattleInput => {
  const payload = duel(moves);

  return {
    characterId: "1",
    warriors: [
      {
        originalId: "1",
        name: "Attacker",
        lvl: 190,
        prof: "w",
        icon: "/warrior.gif",
        team: 1,
      },
      {
        originalId: "2",
        name: "Defender",
        lvl: 190,
        prof: "m",
        icon: "/mage.gif",
        team: 2,
      },
    ],
    moves: parseBattleMoves(payload.events),
    world: "luvia",
    battleType: "1v1",
    winner: "Attacker",
    winningTeam: 1,
    hasFlee: false,
    unfinished: false,
    ...overrides,
  };
};

describe("replay-timeline", () => {
  it("maps attacks, legendary procs, heals, dots, deaths, and victory into deterministic events", () => {
    const timeline = buildReplayTimeline(
      buildSampleInput([
        "1=100;2=70;+dmg=5200;+crit;-dmg=4100;+wound",
        "2=70;1=62;+dmgf=3800;-dmgf=3200;+legbon_curse",
        "1=58;0=0;wound=650;heal=1200",
        "1=58;2=35;+dmg=9500;+verycrit;-dmg=7800;legbon_lastheal=4000,Defender(35%)",
        "1=58;2=0;+dmg=8200;-dmg=6900;winner=Attacker",
      ]),
    );

    expect(timeline.participants).toHaveLength(2);
    expect(timeline.participants[0]?.side).toBe("left");
    expect(timeline.participants[1]?.side).toBe("right");
    expect(timeline.outcome).toBe("victory");
    expect(timeline.mvpId).toBe("1");

    const kinds = timeline.events.map((event) => event.kind);

    expect(kinds).toContain("attack");
    expect(kinds).toContain("legendary_proc");
    expect(kinds).toContain("dot");
    expect(kinds).toContain("heal");
    expect(kinds).toContain("death");
    expect(kinds.at(-1)).toBe("victory");

    const bigCrit = timeline.events.find(
      (event) => event.kind === "attack" && event.isVeryCrit,
    );

    expect(bigCrit?.isHighlight).toBe(true);
    expect(bigCrit?.timeScale).toBeLessThan(1);

    const lastHeal = timeline.events.find(
      (event) =>
        event.kind === "legendary_proc" && event.legendaryKind === "lastHeal",
    );

    expect(lastHeal).toMatchObject({
      kind: "legendary_proc",
      actorId: "2",
      isHighlight: true,
    });
  });

  it("compresses 60+ turn fights into a ~20-35s social clip in smart pacing while keeping highlights slow", () => {
    const longMoves = Array.from({ length: 65 }, (_, index) => {
      const hp = Math.max(1, 100 - Math.floor((index / 65) * 95));

      return index === 30
        ? `1=80;2=${hp};+dmg=12000;+verycrit;-dmg=9500`
        : `1=80;2=${hp};+dmg=1500;-dmg=1200`;
    });

    longMoves.push("1=80;2=0;+dmg=3000;-dmg=2500;winner=Attacker");

    const smart = buildReplayTimeline(
      buildSampleInput(longMoves, { pacingMode: "smart" }),
    );

    const normal = buildReplayTimeline(
      buildSampleInput(longMoves, { pacingMode: "normal" }),
    );

    expect(smart.totalDurationMs).toBeLessThan(normal.totalDurationMs);
    expect(smart.totalDurationMs).toBeGreaterThanOrEqual(15_000);
    expect(smart.totalDurationMs).toBeLessThanOrEqual(35_000);

    const smartHighlight = smart.events.find(
      (event) => event.kind === "attack" && event.isVeryCrit,
    );

    const smartNormalHit = smart.events.find(
      (event) => event.kind === "attack" && !event.isHighlight,
    );

    expect(smartHighlight).toBeDefined();
    expect(smartNormalHit).toBeDefined();
    expect(smartHighlight!.tEnd - smartHighlight!.tStart).toBeGreaterThan(
      smartNormalHit!.tEnd - smartNormalHit!.tStart,
    );
  });

  it("computes instant snapshot state and trailing HP damage at any seek timestamp", () => {
    const timeline = buildReplayTimeline(
      buildSampleInput([
        "1=100;2=60;+dmg=6000;-dmg=5000",
        "2=60;1=80;+dmgf=3000;-dmgf=2500",
        "1=80;2=0;+dmg=9000;-dmg=8000;winner=Attacker",
      ]),
    );

    const startState = getReplayStateAtTime(timeline, 0);
    expect(startState.hpById["2"]).toBe(100);
    expect(startState.trailingHpById["2"]).toBe(100);

    const firstSnapshot = timeline.snapshots[1]!;

    expect(
      getReplayStateAtTime(timeline, firstSnapshot.impactMs - 1).hpById["2"],
    ).toBe(100);

    const rightAfterHit = getReplayStateAtTime(
      timeline,
      firstSnapshot.impactMs + 40,
    );

    expect(rightAfterHit.hpById["2"]).toBe(60);
    expect(rightAfterHit.trailingHpById["2"]).toBeGreaterThan(60);
    expect(rightAfterHit.trailingHpById["2"]).toBeLessThanOrEqual(100);

    const settledState = getReplayStateAtTime(
      timeline,
      firstSnapshot.impactMs + 400,
    );

    expect(settledState.trailingHpById["2"]).toBe(settledState.hpById["2"]);

    const outroState = getReplayStateAtTime(
      timeline,
      timeline.actionDurationMs + 900,
    );

    expect(outroState.victoryEvent?.outcome).toBe("victory");
    expect(outroState.victoryProgress).toBeGreaterThan(0);
    expect(outroState.deadIds.has("2")).toBe(true);
  });

  it("moves a stepping fighter even when the same move also heals them", () => {
    const timeline = buildReplayTimeline(
      buildSampleInput([
        "1=100;0;step=1;heal=500",
        "1=100;2=0;+dmg=500;-dmg=500",
      ]),
    );

    expect(timeline.events.some((event) => event.kind === "step")).toBe(true);
    expect(timeline.snapshots.at(-1)?.rowById["1"]).not.toBe(
      timeline.snapshots[0]?.rowById["1"],
    );
  });

  it("credits a last-heal proc to the fighter it saved", () => {
    const timeline = buildReplayTimeline(
      buildSampleInput([
        "1=100;2=35;+dmg=9500;-dmg=7800;legbon_lastheal=4000,Defender(35%)",
      ]),
    );

    const heal = timeline.events.find((event) => event.kind === "heal");

    expect(heal).toMatchObject({ actorId: "2", targetId: "2", amount: 4000 });
  });

  it("keeps HP the log reports on a move that produces no visible event", () => {
    const timeline = buildReplayTimeline(
      buildSampleInput(["1=100;2=60;+dmg=500;-dmg=500", "2=40;0"]),
    );

    expect(
      getReplayStateAtTime(timeline, timeline.totalDurationMs).hpById["2"],
    ).toBe(40);
  });

  it("records the attacker's death when reflected damage finishes them", () => {
    const timeline = buildReplayTimeline(
      buildSampleInput([
        "1=90;2=100;+dmg=500;-dmg=0;+oth_dmg=150,dmg,Attacker(0%)",
      ]),
    );

    expect(
      timeline.events.find((event) => event.kind === "death"),
    ).toMatchObject({
      victimId: "1",
      killerId: "2",
    });
  });

  it("marks a fighter as wounded when a wound ticks on them", () => {
    const timeline = buildReplayTimeline(
      buildSampleInput(["1=95;0;wound=120"]),
    );

    expect(timeline.snapshots.at(-1)?.statusesById["1"]).toContain("wound");
  });
});
