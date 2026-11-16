import type { CharacterAuraId } from "@lootlog/schema/character-aura";
import type { AuraPreset } from "./preset";

export const UNIQUE_AURAS = {
  halo: {
    id: "halo",
    tier: "unique",
    description:
      "Lekka aura dla słabszych komputerów: nad głową unosi się srebrna aureola, pod stopami lśni cienki krąg, a w górę ulatują pojedyncze iskry.",
    particles: ["#ffffff", "#e4ecff", "#b8c8ff", "#8a9cff"],
    rim: "#e4ecff",
    haze: "#8a9cff",
    near: 0.8,
    far: 0.5,
    inner: 0,
    pulse: () => 1,
    ground: { style: "halo", color: "#b8c8ff", alpha: 0.6 },
    emitters: [
      {
        kind: "mote",
        rate: 3,
        from: "feet-rim",
        life: [1.2, 2],
        speed: [8, 14],
        spread: 0.3,
        size: [0.7, 1.3],
        colors: 3,
        front: 0.5,
      },
      {
        kind: "glint",
        rate: 0.6,
        from: "edge-high",
        life: [0.4, 0.7],
        speed: [0, 1],
        size: [3, 5],
        front: 1,
      },
    ],
    fx: ["halo"],
    burst: "descend",
    tip: "halo",
    nick: ["#ffffff", "#c8d4ff", "#7a8cc8"],
    tones: ["#ffffff", "#c8d4ff", "#7a8cc8"],
    lite: true,
    bare: true,
  },
} satisfies Partial<Record<CharacterAuraId, AuraPreset>>;
