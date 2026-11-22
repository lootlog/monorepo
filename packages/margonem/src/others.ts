import type { CharacterTooltipOwner } from "./tooltip.js";

export type GameOther = {
  account: number;
  icon: string;
  id: string;
  lvl: number;
  prof: string;
  nick: string;
  x?: number;
  y?: number;
  relation?: number;
  clan?: { id: number; name: string };
};

export type Other = CharacterTooltipOwner & {
  d: GameOther;
};

export type LegacyGameOther = Omit<GameOther, "id"> & { id: string | number };

export type OtherHandle = (Other | LegacyGameOther) & CharacterTooltipOwner;

export type OldOtherMap = {
  [key: string]: LegacyGameOther;
};

type OtherMap = {
  [key: string]: Other;
};

export type Others = {
  check: () => OtherMap;
  getById: (id: number | string) => Other | undefined;
};
