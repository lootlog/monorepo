import { useState } from "react";
import type { WindowId } from "@/store/windows.store";
import { SANDBOX_SCENARIOS, type SandboxScenario } from "../scenarios";
import type { SandboxController } from "./mount-sandbox-panel";
import { RawEventForm } from "./raw-event-form";
import { SandboxLogList } from "./sandbox-log-list";
import { SessionStatus } from "./session-status";

const WINDOW_SHORTCUTS: readonly WindowId[] = [
  "settings",
  "timers",
  "npc-detector",
  "chat",
  "online-players",
  "notifications",
  "party-finder",
  "quick-access",
];

const SCENARIO_GROUPS: readonly SandboxScenario["group"][] = [
  "NPC",
  "Battle",
  "Map",
  "Players",
  "Hero",
];

function switchInterface(next: "ni" | "si") {
  const url = new URL(window.location.href);
  url.searchParams.set("interface", next);
  window.location.assign(url);
}

function resetStorage() {
  localStorage.clear();
  window.location.reload();
}

export function SandboxPanel({
  controller,
}: {
  controller: SandboxController;
}) {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button
        type="button"
        className="sbx-toggle"
        onClick={() => setOpen(true)}
      >
        Sandbox
      </button>
    );
  }

  return (
    <aside className="sbx-panel" aria-label="Sandbox controls">
      <header className="sbx-header">
        <strong>Sandbox · {controller.interface.toUpperCase()}</strong>
        <button type="button" onClick={() => setOpen(false)}>
          Hide
        </button>
      </header>

      <SessionStatus />

      <section className="sbx-section">
        <h2>Runtime</h2>
        <div className="sbx-buttons">
          <button
            type="button"
            onClick={() =>
              switchInterface(controller.interface === "ni" ? "si" : "ni")
            }
          >
            Switch to {controller.interface === "ni" ? "SI" : "NI"}
          </button>
          <button type="button" onClick={resetStorage}>
            Reset storage
          </button>
        </div>
      </section>

      <section className="sbx-section">
        <h2>Windows</h2>
        <div className="sbx-buttons">
          {WINDOW_SHORTCUTS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => controller.openWindow(id)}
            >
              {id}
            </button>
          ))}
        </div>
      </section>

      {SCENARIO_GROUPS.map((group) => (
        <section key={group} className="sbx-section">
          <h2>{group}</h2>
          <div className="sbx-buttons">
            {SANDBOX_SCENARIOS.filter(
              (scenario) => scenario.group === group,
            ).map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => controller.run(scenario.id)}
              >
                {scenario.label}
              </button>
            ))}
          </div>
        </section>
      ))}

      <RawEventForm onEmit={controller.emit} />
      <SandboxLogList />
    </aside>
  );
}
