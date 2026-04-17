import { describe, expect, it } from "vitest";
import { migrateWindowsState } from "./windows.store";

describe("migrateWindowsState", () => {
  it("treats legacy settings position 0,0 as undefined", () => {
    const migrated = migrateWindowsState(
      {
        settings: {
          open: true,
          position: { x: 0, y: 0 },
          size: { width: 640, height: 440 },
          opacity: 4,
          locked: false,
        },
        windowFocusHistory: [],
      },
      3,
    );

    expect(migrated.settings.hasDefinedPosition).toBe(false);
    expect(migrated.settings.state).toEqual({});
  });

  it("keeps legacy non-zero settings position as defined", () => {
    const migrated = migrateWindowsState(
      {
        settings: {
          open: true,
          position: { x: 24, y: 48 },
          size: { width: 640, height: 440 },
          opacity: 4,
          locked: false,
        },
        windowFocusHistory: [],
      },
      3,
    );

    expect(migrated.settings.hasDefinedPosition).toBe(true);
    expect(migrated.settings.position).toEqual({ x: 24, y: 48 });
  });

  it("removes legacy visible item limits for notifications and npc detector", () => {
    const migrated = migrateWindowsState(
      {
        notifications: {
          open: true,
          position: { x: 0, y: 0 },
          hasDefinedPosition: false,
          size: { width: 360, height: 300 },
          opacity: 4,
          locked: false,
          autoHeightVisibleItemsLimit: 3,
        },
        "npc-detector": {
          open: true,
          position: { x: 0, y: 0 },
          hasDefinedPosition: false,
          size: { width: 300, height: 300 },
          opacity: 4,
          locked: false,
          autoHeightVisibleItemsLimit: 4,
        },
        windowFocusHistory: [],
      },
      5,
    );

    expect(migrated.notifications.maxContentHeight).toBeUndefined();
    expect(migrated["npc-detector"].maxContentHeight).toBeUndefined();
    expect(
      "autoHeightVisibleItemsLimit" in
        (migrated.notifications as unknown as Record<string, unknown>),
    ).toBe(false);
    expect(
      "autoHeightVisibleItemsLimit" in
        (migrated["npc-detector"] as unknown as Record<string, unknown>),
    ).toBe(false);
  });
});
