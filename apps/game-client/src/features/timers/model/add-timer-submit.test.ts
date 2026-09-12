import { describe, expect, it } from "vitest";
import {
  buildCreateManualTimerPayload,
  getNpcRespawnWindowSeconds,
} from "./add-timer-submit";
import type { AddTimerFormValues } from "./add-timer-form-schema";

const selectedNpc = { name: "Tanroth", prof: "W" };

const values = (
  overrides: Partial<AddTimerFormValues>,
): AddTimerFormValues => ({
  name: "Tanroth",
  minDuration: "1m",
  maxDuration: "2m",
  lvl: "120",
  type: "HERO",
  startDate: "",
  endDate: "",
  ...overrides,
});

const build = (
  overrides: Partial<AddTimerFormValues>,
  customDatesEnabled = false,
) =>
  buildCreateManualTimerPayload({
    values: values(overrides),
    world: "berufs",
    guildId: "guild-1",
    selectedNpc,
    customDatesEnabled,
  });

describe("buildCreateManualTimerPayload", () => {
  it("attaches the selected NPC profession only while the name is unchanged", () => {
    expect(build({})).toMatchObject({ prof: "W", lvl: 120, type: "HERO" });
    expect(build({ name: "Tanroth II" })).not.toHaveProperty("prof");
  });

  it("uses custom dates instead of durations when enabled", () => {
    const payload = build(
      {
        minDuration: "",
        maxDuration: "",
        startDate: "2026-01-01T10:00",
        endDate: "2026-01-01T11:00",
      },
      true,
    );

    expect(payload).toMatchObject({
      customMinSpawnTime: new Date("2026-01-01T10:00"),
      customMaxSpawnTime: new Date("2026-01-01T11:00"),
    });
    expect(payload).not.toHaveProperty("minSeconds");

    expect(build({})).toMatchObject({ minSeconds: 60, maxSeconds: 120 });
  });

  it("omits the level when it was cleared and returns null without a guild", () => {
    expect(build({ lvl: "" })).not.toHaveProperty("lvl");
    expect(
      buildCreateManualTimerPayload({
        values: values({}),
        world: "berufs",
        guildId: "",
        selectedNpc: null,
        customDatesEnabled: false,
      }),
    ).toBeNull();
  });
});

describe("getNpcRespawnWindowSeconds", () => {
  it("spreads the base respawn by the NPC randomness and falls back to the default", () => {
    expect(
      getNpcRespawnWindowSeconds({
        latestRespBaseSeconds: 100,
        latestRespawnRandomness: 20,
      }),
    ).toEqual({ minSeconds: 80, maxSeconds: 120 });
    expect(
      getNpcRespawnWindowSeconds({
        latestRespBaseSeconds: 100,
        latestRespawnRandomness: null,
      }),
    ).toEqual({ minSeconds: 90, maxSeconds: 110 });
  });
});
