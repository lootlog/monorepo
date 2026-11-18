import type { Engine } from "@lootlog/margonem/engine";

type WorldConfigHolder = {
  worldConfig?: Partial<Pick<Engine["worldConfig"], "getNpcResp">>;
};

type WorldConfigRuntimeWindow = Window & {
  Engine?: WorldConfigHolder;
  g?: WorldConfigHolder;
};

const getRuntimeWindow = (): WorldConfigRuntimeWindow => window;

/**
 * How many times faster than the base time NPCs return on this world, from
 * the world's own server parameters; 1 until the game has received them.
 */
export const getNpcRespawnMultiplier = (): number => {
  try {
    const runtime = getRuntimeWindow();
    const holder = runtime.Engine ?? runtime.g;
    const multiplier = Number(holder?.worldConfig?.getNpcResp?.());

    return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  } catch {
    return 1;
  }
};
