import { vi } from "vitest";
import type { RuntimeFunction } from "@/lib/margonem-runtime/margonem-runtime-bridge";

// Native packet seam and initialization fields consumed by the real NI adapter.
export function createNativeRuntime() {
  return {
    communication: { parseJSON: vi.fn<RuntimeFunction>() },
    interface: { alreadyInitialised: true },
    hero: {
      d: {
        account: 202,
        id: 101,
        img: "hero.gif",
        lvl: 230,
        nick: "Tester",
        prof: "w",
        x: 1,
        y: 2,
        warrior_stats: { hp: 100, maxhp: 100 },
      },
    },
    map: { d: { id: 42, name: "Ithan", visibility: 30 } },
    npcs: { check: () => ({}) },
    others: { check: () => ({}) },
    worldConfig: { getWorldName: () => "pandora" },
  };
}
