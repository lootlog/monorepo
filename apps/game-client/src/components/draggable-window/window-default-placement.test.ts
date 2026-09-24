import { describe, expect, it } from "vitest";
import { useWindowsStore, type WindowId } from "@/store/windows.store";
import { resolveDefaultWindowPosition } from "./window-default-placement";

const DEFAULT_OPEN_WINDOWS: WindowId[] = ["quick-access", "timers", "chat"];

// Opened by the game on its own, so the player never placed them either.
const AUTOMATIC_WINDOWS: WindowId[] = ["npc-detector", "notifications"];

const sizeOf = (id: WindowId) => useWindowsStore.getInitialState()[id].size;

type Viewport = { width: number; height: number };

/** Names every window that leaves the viewport or covers another one. */
const findLayoutProblems = (ids: WindowId[], viewport: Viewport) => {
  const placed = ids.map((id) => ({
    id,
    ...resolveDefaultWindowPosition(id, sizeOf, viewport),
    ...sizeOf(id),
  }));

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
        first.x < second.x + second.width &&
        second.x < first.x + first.width &&
        first.y < second.y + second.height &&
        second.y < first.y + first.height
          ? [`${first.id} overlaps ${second.id}`]
          : [],
      ),
  );

  return [...outside, ...overlapping];
};

describe("resolveDefaultWindowPosition", () => {
  it.each([
    { width: 1024, height: 600 },
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ])(
    "keeps the windows open from the start apart and inside $width x $height",
    (viewport) => {
      expect(findLayoutProblems(DEFAULT_OPEN_WINDOWS, viewport)).toEqual([]);
    },
  );

  it.each([
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ])(
    "keeps automatically opened windows clear of every default window at $width x $height",
    (viewport) => {
      expect(
        findLayoutProblems(
          [...DEFAULT_OPEN_WINDOWS, ...AUTOMATIC_WINDOWS],
          viewport,
        ),
      ).toEqual([]);
    },
  );
});
