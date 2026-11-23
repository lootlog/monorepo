import type { AdminOverview } from "@lootlog/schema/admin";
import { StatTiles } from "@/components/stat-tiles";
import { roleText, text } from "@/lib/messages";

export function OverviewTiles({ overview }: { overview: AdminOverview }) {
  return (
    <StatTiles
      tiles={[
        { label: text.overviewUsers, value: overview.users },
        { label: text.overviewBanned, value: overview.banned },
        { label: text.overviewSessions, value: overview.activeSessions },
        ...overview.roles.map(({ role, users }) => ({
          label: roleText[role].name,
          value: users,
        })),
      ]}
    />
  );
}
