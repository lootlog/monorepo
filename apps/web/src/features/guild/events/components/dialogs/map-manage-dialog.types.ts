export interface MapData {
  id: string;
  mapId: number;
  mapName: string;
  locationId?: string | null;
}

export interface LocationData {
  id: string;
  name: string;
  order: number;
  maps: MapData[];
}
