import type { AdminOrganization } from "@lootlog/schema/admin-organizations";
import { Link } from "@tanstack/react-router";
import { OrganizationStatusBadge } from "@/components/organization-status-badge";
import { SyncStatusBadge } from "@/components/sync-status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { text } from "@/lib/messages";

export function OrganizationTiles({
  organizations,
}: {
  organizations: ReadonlyArray<AdminOrganization>;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {organizations.map((organization) => (
        <li key={organization.id}>
          <Link
            to="/organizations/$guildId"
            params={{ guildId: organization.id }}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex min-w-0 items-center gap-3">
              <UserAvatar name={organization.name} image={organization.icon} />
              <span className="grid min-w-0 flex-1">
                <span className="truncate font-medium">
                  {organization.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {text.columnMembers}: {organization.activeMembers}
                </span>
              </span>
              <OrganizationStatusBadge status={organization.status} />
            </span>
            <SyncStatusBadge
              status={organization.syncStatus}
              hasRequiredPermissions={organization.hasRequiredPermissions}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
