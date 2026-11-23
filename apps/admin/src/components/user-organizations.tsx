import type { AdminUserOrganization } from "@lootlog/schema/admin-organizations";
import { Badge } from "@lootlog/ui/components/badge";
import { Link } from "@tanstack/react-router";
import { OrganizationStatusBadge } from "@/components/organization-status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { memberTypeText, text } from "@/lib/messages";

export function UserOrganizations({
  organizations,
}: {
  organizations: ReadonlyArray<AdminUserOrganization>;
}) {
  if (organizations.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        {text.userOrganizationsEmpty}
      </p>
    );

  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {organizations.map((organization) => (
        <li key={organization.id}>
          <Link
            to="/organizations/$guildId"
            params={{ guildId: organization.id }}
            className="flex min-w-0 items-center gap-3 rounded-lg border border-border p-3 outline-none hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UserAvatar name={organization.name} image={organization.icon} />
            <span className="grid min-w-0 flex-1">
              <span className="truncate font-medium">{organization.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {memberTypeText[organization.memberType]}
              </span>
            </span>
            <span className="flex flex-wrap justify-end gap-1.5">
              <OrganizationStatusBadge status={organization.status} />
              {organization.memberActive ? null : (
                <Badge variant="secondary">{text.memberInactive}</Badge>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
