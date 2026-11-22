import type { GameEvent } from "@lootlog/margonem/game-events";
import { seedMargonemCharacterList } from "./character-list";
import { createNiEngine } from "./ni-runtime";
import { logSandbox } from "./sandbox-log";
import { createSiGlobals } from "./si-runtime";
import {
  createSandboxWorld,
  type SandboxInterface,
  type SandboxWorld,
} from "./world";

type SandboxRuntimeWindow = Window & {
  Engine?: { communication: { parseJSON: (event: GameEvent) => void } };
  successData?: (payload: string) => void;
  _g?: (command: string) => void;
  getCookie?: (name: string) => string | undefined;
  getZoomFactor?: () => number;
  message?: (text: string) => void;
};

export type SandboxRuntime = {
  interface: SandboxInterface;
  world: SandboxWorld;
  emit: (event: GameEvent) => void;
};

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`;

  const entry = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return entry ? decodeURIComponent(entry.slice(prefix.length)) : undefined;
}

export function installSandboxRuntime(
  runtimeInterface: SandboxInterface,
): SandboxRuntime {
  const runtimeWindow: SandboxRuntimeWindow = window;
  const world = createSandboxWorld();

  document.cookie = `interface=${runtimeInterface}; path=/; SameSite=Lax`;
  seedMargonemCharacterList();

  runtimeWindow.getCookie = readCookie;
  runtimeWindow.getZoomFactor = () => 1;
  runtimeWindow.message = (text) => logSandbox("message", text);
  runtimeWindow._g = (command) => logSandbox("outbound", command);

  if (runtimeInterface === "ni") {
    runtimeWindow.Engine = createNiEngine(world);
  } else {
    Object.assign(runtimeWindow, createSiGlobals(world));
  }

  const emit = (event: GameEvent) => {
    logSandbox("inbound", Object.keys(event).join(", "));

    if (runtimeInterface === "ni") {
      runtimeWindow.Engine?.communication.parseJSON(event);
    } else {
      runtimeWindow.successData?.(JSON.stringify(event));
    }
  };

  return { interface: runtimeInterface, world, emit };
}
