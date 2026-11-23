import type { AdminOrganization } from "@lootlog/schema/admin-organizations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { Link } from "@tanstack/react-router";
import { OrganizationStatusBadge } from "@/components/organization-status-badge";
import { OrganizationTiles } from "@/components/organization-tiles";
import { SyncStatusBadge } from "@/components/sync-status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { formatDate } from "@/lib/format";
import { text } from "@/lib/messages";

const link =
  "rounded-control underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring";

export function OrganizationsTable({
  organizations,
}: {
  organizations: ReadonlyArray<AdminOrganization>;
}) {
  if (organizations.length === 0)
    return (
      <p className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        {text.organizationsEmpty}
      </p>
    );

  return (
    <>
      <div className="md:hidden">
        <OrganizationTiles organizations={organizations} />
      </div>
      <div className="hidden rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{text.columnOrganization}</TableHead>
              <TableHead className="hidden lg:table-cell">
                {text.columnOwner}
              </TableHead>
              <TableHead>{text.columnStatus}</TableHead>
              <TableHead>{text.columnDiscord}</TableHead>
              <TableHead className="text-right">{text.columnMembers}</TableHead>
              <TableHead className="hidden xl:table-cell">
                {text.columnCreated}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((organization) => (
              <TableRow key={organization.id}>
                <TableCell>
                  <Link
                    to="/organizations/$guildId"
                    params={{ guildId: organization.id }}
                    className="flex min-w-0 items-center gap-3 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <UserAvatar
                      name={organization.name}
                      image={organization.icon}
                    />
                    <span className="grid min-w-0">
                      <span className="truncate font-medium underline-offset-4 hover:underline">
                        {organization.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {organization.vanityUrl ?? organization.id}
                      </span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {organization.owner.userId === null ? (
                    <span className="text-muted-foreground">
                      {organization.owner.name ?? text.unknownOwner}
                    </span>
                  ) : (
                    <Link
                      to="/users/$userId"
                      params={{ userId: organization.owner.userId }}
                      className={link}
                    >
                      {organization.owner.name ?? text.unknownOwner}
                    </Link>
                  )}
                </TableCell>
                <TableCell>
                  <OrganizationStatusBadge status={organization.status} />
                </TableCell>
                <TableCell>
                  <SyncStatusBadge
                    status={organization.syncStatus}
                    hasRequiredPermissions={organization.hasRequiredPermissions}
                  />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {organization.activeMembers}
                </TableCell>
                <TableCell className="hidden text-muted-foreground xl:table-cell">
                  {formatDate(organization.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
