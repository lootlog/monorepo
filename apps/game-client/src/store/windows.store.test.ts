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

  it("keeps max content height for notifications and npc detector", () => {
    const migrated = migrateWindowsState(
      {
        notifications: {
          open: true,
          position: { x: 0, y: 0 },
          hasDefinedPosition: false,
          size: { width: 360, height: 300 },
          opacity: 4,
          locked: false,
          maxContentHeight: 160,
        },
        "npc-detector": {
          open: true,
          position: { x: 0, y: 0 },
          hasDefinedPosition: false,
          size: { width: 300, height: 300 },
          opacity: 4,
          locked: false,
          maxContentHeight: 220,
        },
        windowFocusHistory: [],
      },
      5,
    );

    expect(migrated.notifications.maxContentHeight).toBe(160);
    expect(migrated["npc-detector"].maxContentHeight).toBe(220);
  });
});
