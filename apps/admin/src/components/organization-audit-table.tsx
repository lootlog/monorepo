import type { OrganizationAuditEntry } from "@lootlog/schema/admin-organizations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { Link } from "@tanstack/react-router";
import { formatAuditDetails } from "@/lib/audit-details";
import { formatDateTime } from "@/lib/format";
import { organizationAuditActionText, text } from "@/lib/messages";

export function OrganizationAuditTable({
  entries,
  showOrganization,
}: {
  entries: ReadonlyArray<OrganizationAuditEntry>;
  showOrganization: boolean;
}) {
  if (entries.length === 0)
    return <p className="text-sm text-muted-foreground">{text.auditEmpty}</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{text.auditWhen}</TableHead>
          <TableHead>{text.auditAction}</TableHead>
          {showOrganization ? (
            <TableHead>{text.auditOrganization}</TableHead>
          ) : null}
          <TableHead className="hidden md:table-cell">
            {text.auditActor}
          </TableHead>
          <TableHead className="hidden lg:table-cell">
            {text.auditDetails}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {formatDateTime(entry.createdAt)}
            </TableCell>
            <TableCell className="whitespace-normal font-medium">
              {organizationAuditActionText[entry.action]}
            </TableCell>
            {showOrganization ? (
              <TableCell className="whitespace-normal break-words">
                <Link
                  to="/organizations/$guildId"
                  params={{ guildId: entry.organizationId }}
                  className="rounded-control underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {entry.organizationName}
                </Link>
              </TableCell>
            ) : null}
            <TableCell className="hidden text-muted-foreground md:table-cell">
              {entry.actor}
            </TableCell>
            <TableCell className="hidden max-w-md whitespace-normal break-words text-muted-foreground lg:table-cell">
              {formatAuditDetails(entry.details)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
