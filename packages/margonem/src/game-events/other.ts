export type OtherMovement = {
  x: number;
  y: number;
  dir: number;
};

export type OtherDelete = {
  del: number;
};

export type OtherCreate = {
  action: "CREATE";
  account: number;
  nick: string;
  icon: string;
  x: number;
  y: number;
  dir: number;
  stasis: number;
  stasis_incoming_seconds: number;
  rights: number;
  lvl: number;
  oplvl: number;
  prof: string;
  attr: number;
  is_blessed: number;
  relation: number;
  clan?: { id: number; name: string };
  pet?: { name: string; outfit: string; elite: number; action: number };
  wanted?: number;
  guest?: number;
  matchmaking_champion?: number;
  sex?: boolean;
};

/**
 * Partial update of changed fields. Any `stasis` other than 1 ends stasis, and
 * so does movement, which never carries `stasis`.
 */
export type OtherUpdate = Partial<Omit<OtherCreate, "action">>;

export type OtherEntry =
  | OtherMovement
  | OtherDelete
  | OtherUpdate
  | OtherCreate;

export type Other = Record<string, OtherEntry>;
