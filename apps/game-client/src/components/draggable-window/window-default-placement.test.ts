import { describe, expect, it } from "vitest";
import { useWindowsStore, type WindowId } from "@/store/windows.store";
import { resolveDefaultWindowPosition } from "./window-default-placement";

const PINNED_WINDOWS: WindowId[] = ["quick-access", "timers", "chat"];

// Opened by the game on its own, so the player never placed them either.
const ALERT_WINDOWS: WindowId[] = [
  "npc-detector",
  "notifications",
  "battle-pings",
];

const TOOL_WINDOWS: WindowId[] = [
  "online-players",
  "party-finder",
  "create-party-gathering",
];

// Prompts that can be up together while the game runs.
const CONCURRENT_PROMPTS: WindowId[] = [
  "settings",
  "backend-preferences-warning",
  "catching-whitelist-warning",
];

const COMMON_VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
];

const sizeOf = (id: WindowId) => useWindowsStore.getInitialState()[id].size;

type Rect = { x: number; y: number; width: number; height: number };

type Viewport = { width: number; height: number };

const overlaps = (first: Rect, second: Rect) =>
  first.x < second.x + second.width &&
  second.x < first.x + first.width &&
  first.y < second.y + second.height &&
  second.y < first.y + first.height;

const place = (ids: WindowId[], viewport: Viewport) =>
  ids.map((id) => ({
    id,
    ...resolveDefaultWindowPosition(id, sizeOf, viewport),
    ...sizeOf(id),
  }));

/** Names every window that leaves the viewport or covers another one. */
const findLayoutProblems = (ids: WindowId[], viewport: Viewport) => {
  const placed = place(ids, viewport);

  const outside = placed.flatMap((rect) =>
    rect.x < 0 ||
    rect.y < 0 ||
    rect.x + rect.width > viewport.width ||
    rect.y + rect.height > viewport.height
      ? [`${rect.id} leaves the viewport`]
      : [],
  );

  const overlapping = placed.flatMap((first, index) =>
    placed
      .slice(index + 1)
      .flatMap((second) =>
        overlaps(first, second) ? [`${first.id} overlaps ${second.id}`] : [],
      ),
  );

  return [...outside, ...overlapping];
};

/** The camera centres on the hero: its tile and the tiles around it. */
const heroArea = (viewport: Viewport): Rect => ({
  x: viewport.width / 2 - 48,
  y: viewport.height / 2 - 48,
  width: 96,
  height: 96,
});

const findWindowsOverHero = (ids: WindowId[], viewport: Viewport) =>
  place(ids, viewport)
    .filter((rect) => overlaps(rect, heroArea(viewport)))
    .map((rect) => rect.id);

describe("resolveDefaultWindowPosition", () => {
  it.each([
    { width: 1024, height: 600 },
    { width: 1280, height: 720 },
    ...COMMON_VIEWPORTS,
  ])(
    "keeps the windows open from the start apart and inside $width x $height",
    (viewport) => {
      expect(findLayoutProblems(PINNED_WINDOWS, viewport)).toEqual([]);
    },
  );

  it.each([
    { width: 1280, height: 720 },
    { width: 1280, height: 800 },
    ...COMMON_VIEWPORTS,
  ])(
    "keeps automatically opened windows apart and clear of the windows open from the start at $width x $height",
    (viewport) => {
      expect(
        findLayoutProblems([...PINNED_WINDOWS, ...ALERT_WINDOWS], viewport),
      ).toEqual([]);
    },
  );

  it.each(COMMON_VIEWPORTS)(
    "keeps tools apart and clear of the windows open from the start at $width x $height",
    (viewport) => {
      expect(
        findLayoutProblems([...PINNED_WINDOWS, ...TOOL_WINDOWS], viewport),
      ).toEqual([]);
    },
  );

  it.each([
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ])(
    "opens tools clear of automatically opened windows at $width x $height",
    (viewport) => {
      expect(
        findLayoutProblems(
          [...PINNED_WINDOWS, ...ALERT_WINDOWS, ...TOOL_WINDOWS],
          viewport,
        ),
      ).toEqual([]);
    },
  );

  it.each(COMMON_VIEWPORTS)(
    "leaves the hero visible behind every stacked window at $width x $height",
    (viewport) => {
      expect(
        findWindowsOverHero(
          [...PINNED_WINDOWS, ...ALERT_WINDOWS, ...TOOL_WINDOWS],
          viewport,
        ),
      ).toEqual([]);
    },
  );

  it.each([
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ])("opens warnings above the hero at $width x $height", (viewport) => {
    expect(
      findWindowsOverHero(
        ["backend-preferences-warning", "catching-whitelist-warning"],
        viewport,
      ),
    ).toEqual([]);
  });

  it.each(COMMON_VIEWPORTS)(
    "keeps every title bar of prompts that open together visible at $width x $height",
    (viewport) => {
      const titleBars = place(CONCURRENT_PROMPTS, viewport).map((rect) => ({
        id: rect.id,
        x: rect.x,
        y: rect.y,
      }));

      const coincident = titleBars.flatMap((first, index) =>
        titleBars
          .slice(index + 1)
          .filter(
            (second) =>
              Math.abs(first.x - second.x) < 16 &&
              Math.abs(first.y - second.y) < 16,
          )
          .map((second) => `${first.id} hides ${second.id}`),
      );

      expect(coincident).toEqual([]);
    },
  );
});
