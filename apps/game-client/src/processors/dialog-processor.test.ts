import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOOT_CREATE_DEBUG_PREFIX } from "@/lib/loot-create-debug";
import { useDialogStore } from "@/store/game-store/dialog.store";
import { useSettingsStore } from "@/store/settings.store";
import { DialogProcessor } from "./dialog-processor";

describe("DialogProcessor", () => {
  let processor: DialogProcessor;

  beforeEach(() => {
    processor = new DialogProcessor();
    useDialogStore.setState({
      talkingNpcId: null,
    });
    useSettingsStore.getState().setLootDebugLoggingEnabled(false);
  });

  it("ignores invalid dialog payloads", () => {
    processor.handle({});
    processor.handle({ d: ["a", "b"] });
    processor.handle({ d: "invalid" as never });
    processor.handle({ d: ["a", "b", 123 as never] });

    expect(useDialogStore.getState().talkingNpcId).toBeNull();
  });

  it("stores npc id from dialog payload", () => {
    processor.handle({ d: ["show", "dialog", "404"] });

    expect(useDialogStore.getState().talkingNpcId).toBe("404");
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
