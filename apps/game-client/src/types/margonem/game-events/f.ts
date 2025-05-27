export type W = {
  [key: string]: {
    id: number;
    originalId: number;
    name: string;
    lvl: number;
    prof: string;
    hpp: number;
    icon: string;
    team: number;
    wt: number;
    type: number;
  };
};

export type F = {
  close?: number;
  endBattle?: number;
  m?: string[];
  mi?: number[];
  auto?: "0" | "1";
  battleground?: string;
  current?: number;
  init?: "1";
  move?: number;
  myteam?: number;
  w: W;
};
