import type { AdminOverview } from "@lootlog/client/auth";
import { roleText, text } from "@/lib/messages";

/** Platform-wide counts above the user list. */
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
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="flex flex-col-reverse justify-end gap-1 rounded-lg border border-border bg-card px-4 py-3"
        >
          <dt className="text-xs text-muted-foreground">{tile.label}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{tile.value}</dd>
        </div>
      ))}
    </dl>
  );
}
