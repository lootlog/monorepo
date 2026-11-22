import type { Engine } from "@lootlog/margonem/engine";

type WorldConfigHolder = {
  worldConfig?: Partial<Pick<Engine["worldConfig"], "getNpcResp">>;
};

type WorldConfigRuntimeWindow = Window & {
  Engine?: WorldConfigHolder;
  g?: WorldConfigHolder;
};

const getRuntimeWindow = (): WorldConfigRuntimeWindow => window;

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
