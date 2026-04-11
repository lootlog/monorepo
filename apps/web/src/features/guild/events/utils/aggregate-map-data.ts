export interface MapDataEntry {
  mapId: string;
  mapName: string;
  assignmentDurationSeconds: number;
  presenceTimeSeconds: number;
  afkTimeSeconds: number;
}

export interface AggregatedMapData {
  mapId: string;
  mapName: string;
  assignmentDurationSeconds: number;
  presenceTimeSeconds: number;
  afkTimeSeconds: number;
}

export const aggregateMapData = (
  mapData: MapDataEntry[],
): AggregatedMapData[] => {
  const aggregated = new Map<string, AggregatedMapData>();

  for (const map of mapData) {
    const existing = aggregated.get(map.mapId);
    if (existing) {
      existing.assignmentDurationSeconds += map.assignmentDurationSeconds;
      existing.presenceTimeSeconds += map.presenceTimeSeconds;
      existing.afkTimeSeconds += map.afkTimeSeconds;
    } else {
      aggregated.set(map.mapId, {
        mapId: map.mapId,
        mapName: map.mapName,
        assignmentDurationSeconds: map.assignmentDurationSeconds,
        presenceTimeSeconds: map.presenceTimeSeconds,
        afkTimeSeconds: map.afkTimeSeconds,
      });
    }
  }

  return Array.from(aggregated.values());
};

export const formatMapNamesFromMapData = (
  mapData: MapDataEntry[] | null | undefined,
): string => {
  if (!Array.isArray(mapData) || mapData.length === 0) {
    return "—";
  }

  const names = aggregateMapData(mapData)
    .map((entry) => entry.mapName.trim())
    .filter((entry) => entry.length > 0);

  if (names.length === 0) {
    return "—";
  }

  return names.join(", ");
};
