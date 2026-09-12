import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { useWindowsStore, type WindowId } from "@/store/windows.store";
import type { SandboxRuntime } from "../fake-runtime/install";
import { SANDBOX_SCENARIOS } from "../scenarios";
import { SandboxPanel } from "./sandbox-panel";
import "./sandbox-panel.css";

export type SandboxController = {
  interface: SandboxRuntime["interface"];
  world: SandboxRuntime["world"];
  emit: (event: GameEvent) => void;
  run: (scenarioId: string) => boolean;
  scenarios: () => string[];
  openWindow: (id: WindowId) => void;
};

declare global {
  interface Window {
    __sandbox?: SandboxController;
  }
}

export function mountSandboxPanel(runtime: SandboxRuntime): void {
  const controller: SandboxController = {
    interface: runtime.interface,
    world: runtime.world,
    emit: runtime.emit,
    run: (scenarioId) => {
      const event = SANDBOX_SCENARIOS.find(
        ({ id }) => id === scenarioId,
      )?.build(runtime.world);

      if (!event) return false;
      runtime.emit(event);

      return true;
    },
    scenarios: () => SANDBOX_SCENARIOS.map(({ id }) => id),
    openWindow: (id) => useWindowsStore.getState().setOpen(id, true),
  };

  window.__sandbox = controller;

  const container = document.getElementById("sandbox-panel-root");

  if (!container) return;

  createRoot(container).render(
    <StrictMode>
      <SandboxPanel controller={controller} />
    </StrictMode>,
  );
}
