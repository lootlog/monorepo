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
};

export type Other = CharacterTooltipOwner & {
  d: GameOther;
};

// NI OthersManager.updateDATA assigns the string key from its for-in traversal.
// Legacy globals also expose numeric IDs, retained by the SI adapter fixtures.
export type LegacyGameOther = Omit<GameOther, "id"> & { id: string | number };

/** NI wraps character data in d; SI keeps that data directly on the handle. */
export type OtherHandle = (Other | LegacyGameOther) & CharacterTooltipOwner;

export type OldOtherMap = {
  [key: string]: LegacyGameOther;
};

export type OtherMap = {
  [key: string]: Other;
};

export type Others = {
  check: () => OtherMap;
  getById: (id: number | string) => Other | undefined;
};
