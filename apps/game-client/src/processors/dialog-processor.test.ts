import { beforeEach, describe, expect, it } from "vitest";
import { useDialogStore } from "@/store/game-store/dialog.store";
import { DialogProcessor } from "./dialog-processor";

describe("DialogProcessor", () => {
  let processor: DialogProcessor;

  beforeEach(() => {
    processor = new DialogProcessor();
    useDialogStore.setState({
      talkingNpcId: null,
    });
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
});
