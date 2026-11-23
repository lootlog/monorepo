import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NpcType } from "@/api/npcs.api";
import type { Timer } from "@/api/timers.api";
import { getSettingsDefaultValue } from "@/lib/settings-persistence/settings-documents";
import type { TimerSoundSettings } from "@/lib/settings-persistence/use-sound-settings";
import { createTimerFixture } from "@/test/timer-fixtures";
import {
  collectTimerSoundEvents,
  createTimerSoundScheduler,
  getTimerSoundPreferences,
} from "./timer-sounds";

const heroTimer = createTimerFixture({
  minSpawnTime: "2026-04-22T10:00:00.000Z",
  maxSpawnTime: "2026-04-22T10:05:00.000Z",
});

const eliteTimer = createTimerFixture({
  timerKey: "timer-2",
  npc: { ...heroTimer.npc, name: "Mushita", type: NpcType.ELITE2 },
});

const defaultSoundSettings = (): TimerSoundSettings => ({
  timersConfig: {},
  timerWindowSoonSound: getSettingsDefaultValue("sounds.timerWindowSoonSound"),
  timerWindowSoonMinutes: getSettingsDefaultValue(
    "sounds.timerWindowSoonMinutes",
  ),
  timerWindowOpenSound: getSettingsDefaultValue("sounds.timerWindowOpenSound"),
  timerWindowEndSound: getSettingsDefaultValue("sounds.timerWindowEndSound"),
  timerSoundNpcNames: getSettingsDefaultValue("sounds.timerSoundNpcNames"),
});

const heroSoundSettings = (
  overrides: Partial<TimerSoundSettings> = {},
): TimerSoundSettings => ({
  ...defaultSoundSettings(),
  timersConfig: { HERO: { volume: 0.5, soundUrl: "", enabled: true } },
  ...overrides,
});

const events = (
  timers: readonly Timer[],
  settings: TimerSoundSettings,
  hiddenNpcNames: readonly string[] = [],
) =>
  collectTimerSoundEvents(
    timers,
    getTimerSoundPreferences(settings, hiddenNpcNames),
  );

describe("timer sounds", () => {
  const play = vi.fn<(npcTypes: ReadonlySet<string>) => void>();
  let scheduler: ReturnType<typeof createTimerSoundScheduler>;

  const start = (at: string) => {
    vi.setSystemTime(new Date(at));
    scheduler = createTimerSoundScheduler(play);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    play.mockReset();
  });

  afterEach(() => {
    scheduler.dispose();
    vi.useRealTimers();
  });

  it("stays silent with default settings even for a timer type that is enabled", () => {
    start("2026-04-22T09:50:00.000Z");
    scheduler.update(events([heroTimer], heroSoundSettings()));

    vi.advanceTimersByTime(20 * 60_000);

    expect(play).not.toHaveBeenCalled();
  });

  it("plays once when the respawn window opens, and not again after a refetch", () => {
    const settings = heroSoundSettings({ timerWindowOpenSound: true });
    start("2026-04-22T09:59:00.000Z");
    scheduler.update(events([heroTimer, eliteTimer], settings));

    vi.advanceTimersByTime(59_999);
    expect(play).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(play).toHaveBeenCalledExactlyOnceWith(new Set([NpcType.HERO]));

    vi.advanceTimersByTime(1_000);
    scheduler.update(events([heroTimer, eliteTimer], settings));
    vi.advanceTimersByTime(30 * 60_000);

    expect(play).toHaveBeenCalledOnce();
  });

  it("skips moments that passed before the client loaded and plays the ones still ahead", () => {
    start("2026-04-22T10:02:00.000Z");
    scheduler.update(
      events(
        [heroTimer],
        heroSoundSettings({
          timerWindowOpenSound: true,
          timerWindowEndSound: true,
        }),
      ),
    );

    vi.advanceTimersByTime(2 * 60_000);
    expect(play).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);
    expect(play).toHaveBeenCalledExactlyOnceWith(new Set([NpcType.HERO]));
  });

  it("does not play a moment that passed before its trigger was switched on", () => {
    start("2026-04-22T09:50:00.000Z");
    scheduler.update(events([heroTimer], heroSoundSettings()));

    vi.advanceTimersByTime(11 * 60_000);
    scheduler.update(
      events([heroTimer], heroSoundSettings({ timerWindowOpenSound: true })),
    );
    vi.advanceTimersByTime(60_000);

    expect(play).not.toHaveBeenCalled();
  });

  it("plays the configured number of minutes before the window opens", () => {
    start("2026-04-22T09:50:00.000Z");
    scheduler.update(
      events(
        [heroTimer],
        heroSoundSettings({
          timerWindowSoonSound: true,
          timerWindowSoonMinutes: 3,
        }),
      ),
    );

    vi.advanceTimersByTime(7 * 60_000 - 1);
    expect(play).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(play).toHaveBeenCalledOnce();
  });

  it("selects timers by enabled type or by a single timer the player switched on", () => {
    start("2026-04-22T09:50:00.000Z");
    const settings = heroSoundSettings({ timerWindowOpenSound: true });

    expect(events([eliteTimer], settings)).toEqual([]);
    expect(
      events([eliteTimer], { ...settings, timerSoundNpcNames: ["Mushita"] }),
    ).toEqual([{ at: Date.parse(heroTimer.minSpawnTime), npcType: "ELITE2" }]);
    expect(events([heroTimer], settings, ["Tanroth"])).toEqual([]);
    expect(
      events([heroTimer], { ...settings, timerSoundNpcNames: ["Tanroth"] }, [
        "Tanroth",
      ]),
    ).toHaveLength(1);
  });
});
