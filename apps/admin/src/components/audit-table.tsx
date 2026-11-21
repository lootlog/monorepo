import { Badge } from "@lootlog/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { Link } from "@tanstack/react-router";
import { formatDateTime } from "@/lib/format";
import { auditActionText, text } from "@/lib/messages";
import type { AuditRow } from "@/server/queries";

/** Audit entries, newest first; `showTarget` adds the User each one concerns. */
export function AuditTable({
  entries,
  showTarget,
}: {
  entries: ReadonlyArray<AuditRow>;
  showTarget: boolean;
}) {
  if (entries.length === 0)
    return <p className="text-sm text-muted-foreground">{text.auditEmpty}</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{text.auditWhen}</TableHead>
          <TableHead>{text.auditAction}</TableHead>
          {showTarget ? <TableHead>{text.auditTarget}</TableHead> : null}
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
            <TableCell className="font-medium">
              <span className="flex flex-wrap items-center gap-2">
                {auditActionText[entry.action]}
                {entry.incomplete ? (
                  <Badge variant="destructive" title={text.auditIncompleteHint}>
                    {text.auditIncomplete}
                  </Badge>
                ) : null}
              </span>
            </TableCell>
            {showTarget ? (
              <TableCell>
                {entry.targetUserId !== null && entry.targetName !== null ? (
                  <Link
                    to="/users/$userId"
                    params={{ userId: entry.targetUserId }}
                    className="rounded-control underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {entry.targetName}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">
                    {text.auditDeletedUser}
                  </span>
                )}
              </TableCell>
            ) : null}
            <TableCell className="hidden text-muted-foreground md:table-cell">
              {entry.actor}
            </TableCell>
            <TableCell className="hidden max-w-md whitespace-normal break-words text-muted-foreground lg:table-cell">
              {entry.details}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
