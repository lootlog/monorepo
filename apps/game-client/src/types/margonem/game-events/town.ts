export interface TownEvent {
  id: number;
  name: string;
  mainid: number;
  bg: string;
  file: string;
  mode: number;
  pvp: number;
  visibility: number;
  water: string;
  x: number;
  y: number;
  is_drop_item_tax?: boolean;
  srajId?: number;
  params?: {
    battlePoolTimeLimits?: {
      minimum: number;
      penalty: number;
      total: number;
    };
    isClearEnabled?: boolean;
    lvlMax?: number;
    lvlMin?: number;
    respawn?: string;
  };
}
