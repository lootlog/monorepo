export type OtherEventEntry = {
  del?: number;
  action?: "CREATE";
  id?: number;
  account?: number;
  nick?: string;
  icon?: string;
  x?: number;
  y?: number;
  dir?: number;
  stasis?: number;
  stasis_incoming_seconds?: number;
  rights?: number;
  lvl?: number;
  oplvl?: number;
  prof?: string;
  attr?: number;
  is_blessed?: number;
  relation?: number;
  clan?: {
    id: number;
    name: string;
  };
  pet?: {
    name: string;
    outfit: string;
    elite: number;
    action: number;
  };
};

export type Other = Record<string, OtherEventEntry>;
