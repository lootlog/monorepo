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

  it("adds missing add timer window state for persisted windows", () => {
    const migrated = migrateWindowsState(
      {
        "add-timer": {
          open: false,
          position: { x: 0, y: 0 },
          hasDefinedPosition: false,
          size: { width: 242, height: 300 },
          opacity: 4,
          locked: false,
        },
        windowFocusHistory: [],
      },
      6,
    );

    expect(migrated["add-timer"].state).toEqual({});
  });

  it("removes old online players feature state from persisted windows", () => {
    const migrated = migrateWindowsState(
      {
        "online-players": {
          open: true,
          position: { x: 50, y: 60 },
          hasDefinedPosition: true,
          size: { width: 280, height: 340 },
          opacity: 2,
          locked: true,
          state: {
            viewMode: "members",
            filtersVisible: false,
            filtersByGuildId: {
              "guild-1": {
                minLvl: 100,
                maxLvl: 200,
                selectedProfession: "invalid",
              },
            },
          },
        },
        windowFocusHistory: [],
      },
      7,
    );

    expect(migrated["online-players"]).toEqual({
      open: true,
      position: { x: 50, y: 60 },
      hasDefinedPosition: true,
      size: { width: 280, height: 340 },
      opacity: 2,
      locked: true,
    });
  });

  it("keeps online players window settings without feature state", () => {
    const migrated = migrateWindowsState(
      {
        chat: {
          open: true,
          position: { x: 10, y: 20 },
          hasDefinedPosition: true,
          size: { width: 320, height: 260 },
          opacity: 3,
          locked: true,
        },
        notifications: {
          open: false,
          position: { x: 30, y: 40 },
          hasDefinedPosition: true,
          size: { width: 360, height: 300 },
          opacity: 4,
          locked: false,
          maxContentHeight: 180,
        },
        "online-players": {
          open: true,
          position: { x: 50, y: 60 },
          hasDefinedPosition: true,
          size: { width: 280, height: 340 },
          opacity: 2,
          locked: false,
        },
        currentWindowFocus: "online-players",
        windowFocusHistory: ["online-players", "chat"],
      },
      6,
    );

    expect(migrated.chat).toEqual({
      open: true,
      position: { x: 10, y: 20 },
      hasDefinedPosition: true,
      size: { width: 320, height: 260 },
      opacity: 3,
      locked: true,
    });
    expect(migrated.notifications).toEqual({
      open: false,
      position: { x: 30, y: 40 },
      hasDefinedPosition: true,
      size: { width: 360, height: 300 },
      opacity: 4,
      locked: false,
      maxContentHeight: 180,
    });
    expect(migrated["online-players"]).toEqual({
      open: true,
      position: { x: 50, y: 60 },
      hasDefinedPosition: true,
      size: { width: 280, height: 340 },
      opacity: 2,
      locked: false,
    });
    expect(migrated.currentWindowFocus).toBe("online-players");
    expect(migrated.windowFocusHistory).toEqual(["online-players", "chat"]);
  });
});
