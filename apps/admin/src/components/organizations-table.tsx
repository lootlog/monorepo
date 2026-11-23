import type { AdminOrganization } from "@lootlog/schema/admin-organizations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { OrganizationStatusBadge } from "@/components/organization-status-badge";
import { OrganizationTiles } from "@/components/organization-tiles";
import { SyncStatusBadge } from "@/components/sync-status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { formatDate } from "@/lib/format";
import { RESULT_NAME_LINK_CLASS, RESULT_TABLE_CLASS } from "@/lib/list-classes";
import { text } from "@/lib/messages";

export function OrganizationsTable({
  organizations,
  empty,
}: {
  organizations: ReadonlyArray<AdminOrganization>;
  empty: ReactNode;
}) {
  if (organizations.length === 0) return empty;

  return (
    <>
      <OrganizationTiles organizations={organizations} />
      <div className={RESULT_TABLE_CLASS}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{text.columnOrganization}</TableHead>
              <TableHead>{text.columnOwner}</TableHead>
              <TableHead>{text.columnStatus}</TableHead>
              <TableHead>{text.columnDiscord}</TableHead>
              <TableHead className="text-right">{text.columnMembers}</TableHead>
              <TableHead>{text.columnCreated}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((organization) => (
              <TableRow key={organization.id}>
                <TableCell>
                  <TextLink
                    render={
                      <Link
                        to="/organizations/$guildId"
                        params={{ guildId: organization.id }}
                      />
                    }
                    className={RESULT_NAME_LINK_CLASS}
                  >
                    <UserAvatar
                      name={organization.name}
                      image={organization.icon}
                    />
                    <span className="grid min-w-0">
                      <span className="truncate">{organization.name}</span>
                      <span className="truncate text-xs font-normal text-muted-foreground">
                        {organization.vanityUrl ?? organization.id}
                      </span>
                    </span>
                  </TextLink>
                </TableCell>
                <TableCell>
                  {organization.owner.userId === null ? (
                    <span className="text-muted-foreground">
                      {organization.owner.name ?? text.unknownOwner}
                    </span>
                  ) : (
                    <TextLink
                      render={
                        <Link
                          to="/users/$userId"
                          params={{ userId: organization.owner.userId }}
                        />
                      }
                      className="text-sm"
                    >
                      {organization.owner.name ?? text.unknownOwner}
                    </TextLink>
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
                <TableCell className="text-muted-foreground">
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
