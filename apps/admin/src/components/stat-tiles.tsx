import { StatTile } from "@/components/stat-tile";

export function StatTiles({
  tiles,
}: {
  tiles: ReadonlyArray<{ readonly label: string; readonly value: number }>;
}) {
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <StatTile key={tile.label} label={tile.label} value={tile.value} />
      ))}
    </dl>
  );
}
