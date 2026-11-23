import type { AdminOverview } from "@lootlog/schema/admin";
import { StatsTile } from "@lootlog/ui/components/stats-tile";
import { StatsTileGrid } from "@lootlog/ui/components/stats-tile-grid";
import { StatsTileNumber } from "@lootlog/ui/components/stats-tile-number";
import { roleText, text } from "@/lib/messages";

export function OverviewTiles({ overview }: { overview: AdminOverview }) {
  const tiles = [
    { label: text.overviewUsers, value: overview.users },
    { label: text.overviewBanned, value: overview.banned },
    { label: text.overviewSessions, value: overview.activeSessions },
    ...overview.roles.map(({ role, users }) => ({
      label: roleText[role].name,
      value: users,
    })),
  ];

  return (
    <StatsTileGrid framed className="sm:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => (
        <StatsTile
          key={tile.label}
          label={tile.label}
          value={<StatsTileNumber value={tile.value} />}
        />
      ))}
    </StatsTileGrid>
  );
}
