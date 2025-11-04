import { describe, expect, it, beforeEach } from "vitest";
import { gameEventsStore } from "./game-events.store";
import {
  createMockBattleInitEvent,
  createMockDialogEvent,
  createMockNpcSpawnEvent,
} from "@/hooks/game-events/__tests__/test-helpers";

describe("GameEventsStore", () => {
  beforeEach(() => {
    gameEventsStore.reset();
  });

  describe("pendingBattle", () => {
    it("should set pending battle", () => {
      const warriors = {
        "1": { id: 1, nick: "Test", lvl: 100, prof: 1, team: 1 },
      };
      gameEventsStore.setPendingBattle(warriors);
      expect(gameEventsStore.pendingBattle).toBe(warriors);
    });

    it("should clear pending battle", () => {
      const warriors = { "1": { id: 1, nick: "Test" } };
      gameEventsStore.setPendingBattle(warriors);
      gameEventsStore.setPendingBattle(null);
      expect(gameEventsStore.pendingBattle).toBeNull();
    });

    it("should handle multiple updates", () => {
      const warriors1 = { "1": { id: 1 } };
      const warriors2 = { "2": { id: 2 } };

      gameEventsStore.setPendingBattle(warriors1);
      expect(gameEventsStore.pendingBattle).toBe(warriors1);

      gameEventsStore.setPendingBattle(warriors2);
      expect(gameEventsStore.pendingBattle).toBe(warriors2);
    });
  });

  describe("talkingNpcId", () => {
    it("should set talking NPC ID", () => {
      gameEventsStore.setTalkingNpcId("12345");
      expect(gameEventsStore.talkingNpcId).toBe("12345");
    });

    it("should clear talking NPC ID", () => {
      gameEventsStore.setTalkingNpcId("12345");
      gameEventsStore.setTalkingNpcId(null);
      expect(gameEventsStore.talkingNpcId).toBeNull();
    });

    it("should handle multiple updates", () => {
      gameEventsStore.setTalkingNpcId("12345");
      expect(gameEventsStore.talkingNpcId).toBe("12345");

      gameEventsStore.setTalkingNpcId("67890");
      expect(gameEventsStore.talkingNpcId).toBe("67890");
    });
  });

  describe("latestLootId", () => {
    it("should set latest loot ID", () => {
      gameEventsStore.setLatestLootId(999);
      expect(gameEventsStore.latestLootId).toBe(999);
    });

    it("should clear latest loot ID", () => {
      gameEventsStore.setLatestLootId(999);
      gameEventsStore.setLatestLootId(null);
      expect(gameEventsStore.latestLootId).toBeNull();
    });

    it("should handle multiple updates", () => {
      gameEventsStore.setLatestLootId(100);
      expect(gameEventsStore.latestLootId).toBe(100);

      gameEventsStore.setLatestLootId(200);
      expect(gameEventsStore.latestLootId).toBe(200);
    });

    it("should handle zero as valid value", () => {
      gameEventsStore.setLatestLootId(0);
      expect(gameEventsStore.latestLootId).toBe(0);
    });
  });

  describe("eventHistory", () => {
    it("should add event to history", () => {
      const event = createMockBattleInitEvent();
      gameEventsStore.addEvent(event);

      expect(gameEventsStore.eventHistory).toHaveLength(1);
      expect(gameEventsStore.eventHistory[0]).toBe(event);
    });

    it("should add events to beginning of history (LIFO)", () => {
      const event1 = createMockBattleInitEvent();
      const event2 = createMockDialogEvent("npc-123");
      const event3 = createMockNpcSpawnEvent();

      gameEventsStore.addEvent(event1);
      gameEventsStore.addEvent(event2);
      gameEventsStore.addEvent(event3);

      expect(gameEventsStore.eventHistory[0]).toBe(event3);
      expect(gameEventsStore.eventHistory[1]).toBe(event2);
      expect(gameEventsStore.eventHistory[2]).toBe(event1);
    });

    it("should limit history to maxHistorySize", () => {
      gameEventsStore.maxHistorySize = 3;

      for (let i = 0; i < 5; i++) {
        gameEventsStore.addEvent(createMockBattleInitEvent());
      }

      expect(gameEventsStore.eventHistory).toHaveLength(3);
    });

    it("should keep most recent events when limit reached", () => {
      gameEventsStore.maxHistorySize = 2;

      const event1 = createMockBattleInitEvent();
      const event2 = createMockDialogEvent("npc-123");
      const event3 = createMockNpcSpawnEvent();

      gameEventsStore.addEvent(event1);
      gameEventsStore.addEvent(event2);
      gameEventsStore.addEvent(event3);

      expect(gameEventsStore.eventHistory).toHaveLength(2);
      expect(gameEventsStore.eventHistory[0]).toBe(event3);
      expect(gameEventsStore.eventHistory[1]).toBe(event2);
      expect(gameEventsStore.eventHistory).not.toContain(event1);
    });

    it("should handle maxHistorySize of 1", () => {
      gameEventsStore.maxHistorySize = 1;

      const event1 = createMockBattleInitEvent();
      const event2 = createMockDialogEvent("npc-123");

      gameEventsStore.addEvent(event1);
      expect(gameEventsStore.eventHistory).toHaveLength(1);

      gameEventsStore.addEvent(event2);
      expect(gameEventsStore.eventHistory).toHaveLength(1);
      expect(gameEventsStore.eventHistory[0]).toBe(event2);
    });

    it("should clear history", () => {
      gameEventsStore.addEvent(createMockBattleInitEvent());
      gameEventsStore.addEvent(createMockDialogEvent("npc-123"));
      gameEventsStore.addEvent(createMockNpcSpawnEvent());

      expect(gameEventsStore.eventHistory.length).toBeGreaterThan(0);

      gameEventsStore.clearHistory();

      expect(gameEventsStore.eventHistory).toHaveLength(0);
    });

    it("should handle multiple clear operations", () => {
      gameEventsStore.addEvent(createMockBattleInitEvent());
      gameEventsStore.clearHistory();
      gameEventsStore.clearHistory();

      expect(gameEventsStore.eventHistory).toHaveLength(0);
    });
  });

  describe("reset", () => {
    it("should reset all state", () => {
      gameEventsStore.setPendingBattle({ "1": { id: 1 } });
      gameEventsStore.setTalkingNpcId("12345");
      gameEventsStore.setLatestLootId(999);
      gameEventsStore.addEvent(createMockBattleInitEvent());
      gameEventsStore.addEvent(createMockDialogEvent("npc-123"));

      expect(gameEventsStore.pendingBattle).not.toBeNull();
      expect(gameEventsStore.talkingNpcId).not.toBeNull();
      expect(gameEventsStore.latestLootId).not.toBeNull();
      expect(gameEventsStore.eventHistory.length).toBeGreaterThan(0);

      gameEventsStore.reset();

      expect(gameEventsStore.pendingBattle).toBeNull();
      expect(gameEventsStore.talkingNpcId).toBeNull();
      expect(gameEventsStore.latestLootId).toBeNull();
      expect(gameEventsStore.eventHistory).toHaveLength(0);
    });

    it("should be idempotent", () => {
      gameEventsStore.setPendingBattle({ "1": { id: 1 } });
      gameEventsStore.reset();
      gameEventsStore.reset();

      expect(gameEventsStore.pendingBattle).toBeNull();
      expect(gameEventsStore.talkingNpcId).toBeNull();
      expect(gameEventsStore.latestLootId).toBeNull();
      expect(gameEventsStore.eventHistory).toHaveLength(0);
    });
  });

  describe("initial state", () => {
    it("should have correct default values", () => {
      const freshStore = new (gameEventsStore.constructor as any)();

      expect(freshStore.pendingBattle).toBeNull();
      expect(freshStore.talkingNpcId).toBeNull();
      expect(freshStore.latestLootId).toBeNull();
      expect(freshStore.eventHistory).toEqual([]);
      expect(freshStore.maxHistorySize).toBe(100);
    });
  });

  describe("maxHistorySize", () => {
    it("should allow changing maxHistorySize", () => {
      gameEventsStore.maxHistorySize = 50;
      expect(gameEventsStore.maxHistorySize).toBe(50);

      for (let i = 0; i < 60; i++) {
        gameEventsStore.addEvent(createMockBattleInitEvent());
      }

      expect(gameEventsStore.eventHistory).toHaveLength(50);
    });

    it("should handle maxHistorySize of 0", () => {
      gameEventsStore.maxHistorySize = 0;

      gameEventsStore.addEvent(createMockBattleInitEvent());

      expect(gameEventsStore.eventHistory).toHaveLength(0);
    });
  });
});
