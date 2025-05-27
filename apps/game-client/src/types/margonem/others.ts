export type OtherD = {
  account: number;
  icon: string;
  id: string;
  lvl: number;
  prof: string;
  nick: string;
};

export type Other = {
  d: OtherD;
};

export type OldOtherMap = {
  [key: string]: OtherD;
};

export type OtherMap = {
  [key: string]: Other;
};

export type Others = {
  check: () => OtherMap;
};
