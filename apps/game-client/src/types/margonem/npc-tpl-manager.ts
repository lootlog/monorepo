export type NpcTpl = {
  id: number;
  nick: string;
  prof: string;
  type: number;
  wt: number;
  actions: number;
  grp: number;
  lvl: number;
};

export type NpcTplManager = {
  getNpcTpl: (npcId: number) => NpcTpl | undefined;
};
