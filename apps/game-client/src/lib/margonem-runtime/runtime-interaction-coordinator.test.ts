import { afterEach, describe, expect, it, vi } from "vitest";
import { useDialogStore } from "@/store/game-store/dialog.store";
import { margonemRuntimeBridge } from "./margonem-runtime-bridge";
import { RuntimeInteractionCoordinator } from "./runtime-interaction-coordinator";
import type { RuntimeIntentHandler, RuntimeNpc } from "./runtime.types";

const clickedNpc = Object.freeze({
  icon: "npc.gif",
  id: 501,
  level: 300,
  name: "Example",
  profession: "w",
  templateId: 700,
  type: 2,
  weight: 85,
  x: 12,
  y: 8,
}) satisfies RuntimeNpc;

describe("RuntimeInteractionCoordinator", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useDialogStore.getState().clearNpcContext();
  });

  it("projects talk intents into the dialog context and clears them on cleanup", () => {
    let intentHandler: RuntimeIntentHandler | undefined;
    const unsubscribe = vi.fn();
    vi.spyOn(margonemRuntimeBridge, "subscribeIntent").mockImplementation(
      (handler) => {
        intentHandler = handler;
        return unsubscribe;
      },
    );
    const coordinator = new RuntimeInteractionCoordinator();

    coordinator.install();
    intentHandler?.({ npc: clickedNpc, npcId: clickedNpc.id, type: "talk" });

    expect(useDialogStore.getState().npcContext).toEqual({
      npc: clickedNpc,
      npcId: clickedNpc.id,
      source: "talk-request",
    });

    coordinator.cleanup();

    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(useDialogStore.getState().npcContext).toBeNull();
  });

  it("does not degrade a known NPC snapshot for a repeated queued talk", () => {
    let intentHandler: RuntimeIntentHandler | undefined;
    vi.spyOn(margonemRuntimeBridge, "subscribeIntent").mockImplementation(
      (handler) => {
        intentHandler = handler;
        return vi.fn();
      },
    );
    const coordinator = new RuntimeInteractionCoordinator();

    coordinator.install();
    intentHandler?.({ npc: clickedNpc, npcId: clickedNpc.id, type: "talk" });
    intentHandler?.({ npc: null, npcId: clickedNpc.id, type: "talk" });

    expect(useDialogStore.getState().npcContext).toEqual({
      npc: clickedNpc,
      npcId: clickedNpc.id,
      source: "talk-request",
    });
  });

  it("replaces the context when the user talks to another NPC", () => {
    let intentHandler: RuntimeIntentHandler | undefined;
    vi.spyOn(margonemRuntimeBridge, "subscribeIntent").mockImplementation(
      (handler) => {
        intentHandler = handler;
        return vi.fn();
      },
    );
    const coordinator = new RuntimeInteractionCoordinator();

    coordinator.install();
    intentHandler?.({ npc: clickedNpc, npcId: clickedNpc.id, type: "talk" });
    intentHandler?.({ npc: null, npcId: 777, type: "talk" });

    expect(useDialogStore.getState().npcContext).toEqual({
      npc: null,
      npcId: 777,
      source: "talk-request",
    });
  });
});
