export type GameOther = {
  account: number;
  icon: string;
  id: string;
  lvl: number;
  prof: string;
  nick: string;
};

export type Other = {
  d: GameOther;
};

export type OldOtherMap = {
  [key: string]: GameOther;
};

export type OtherMap = {
  [key: string]: Other;
};

export type Others = {
  check: () => OtherMap;
};
