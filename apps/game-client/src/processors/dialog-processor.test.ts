import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOOT_CREATE_DEBUG_PREFIX } from "@/lib/loot-create-debug";
import { useDialogStore } from "@/store/game-store/dialog.store";
import { useSettingsStore } from "@/store/settings.store";
import { useNpcsStore } from "@/store/npcs.store";
import { DialogProcessor } from "./dialog-processor";

describe("DialogProcessor", () => {
  let processor: DialogProcessor;

  beforeEach(() => {
    processor = new DialogProcessor();
    useDialogStore.getState().clearNpcContext();
    useNpcsStore.getState().clearNpcs();
    useSettingsStore.getState().setLootDebugLoggingEnabled(false);
  });

  it("ignores invalid dialog payloads", () => {
    processor.handle({});
    processor.handle({ d: ["a", "b"] });
    processor.handle({ d: "invalid" as never });
    processor.handle({ d: ["a", "b", 123 as never] });

    expect(useDialogStore.getState().npcContext).toBeNull();
  });

  it("stores npc id from dialog payload", () => {
    useNpcsStore.getState().replaceNpcs([
      {
        id: 404,
        templateId: 404,
        x: 1,
        y: 2,
        icon: "npc.gif",
        name: "Rozmówca",
        profession: "m",
        type: 3,
        weight: 90,
        level: 240,
      },
    ]);

    processor.handle({ d: ["show", "dialog", "404"] });

    expect(useDialogStore.getState().npcContext).toEqual({
      npcId: 404,
      npc: expect.objectContaining({ id: 404, name: "Rozmówca" }),
      source: "dialog-event",
    });
  });

  it("does not discard a snapshot captured by the talk request", () => {
    const capturedNpc = {
      id: 404,
      templateId: 404,
      x: 1,
      y: 2,
      icon: "npc.gif",
      name: "Rozmówca",
      profession: "m",
      type: 3,
      weight: 90,
      level: 240,
    };
    useDialogStore.getState().setNpcContext({
      npcId: 404,
      npc: capturedNpc,
      source: "talk-request",
    });

    processor.handle({ d: ["show", "dialog", "404"] });

    expect(useDialogStore.getState().npcContext).toEqual({
      npcId: 404,
      npc: capturedNpc,
      source: "talk-request",
    });
  });

  it("logs tracked dialog npc context when loot debug logging is enabled", () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);
    const event = { d: ["show", "dialog", "404"] };

    processor.handle(event);

    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      dialog: event.d,
      npcId: "404",
      stage: "dialog-npc-tracked",
    });
  });
});
