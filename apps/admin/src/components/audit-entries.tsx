import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import type { ReactNode } from "react";
import {
  RESULT_TABLE_CLASS,
  RESULT_TILE_CLASS,
  RESULT_TILES_CLASS,
} from "@/lib/list-classes";
import { text } from "@/lib/messages";

export type AuditEntry = {
  readonly id: string;
  readonly when: string;
  readonly action: ReactNode;
  readonly target?: ReactNode;
  readonly actor: string;
  readonly details: ReactNode;
};

export function AuditEntries({
  entries,
  targetLabel,
}: {
  entries: ReadonlyArray<AuditEntry>;
  targetLabel?: string;
}) {
  return (
    <>
      <ul className={RESULT_TILES_CLASS}>
        {entries.map((entry) => (
          <li key={entry.id} className={RESULT_TILE_CLASS}>
            <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
              {entry.action}
            </span>
            {targetLabel === undefined ? null : (
              <span className="text-sm break-words">{entry.target}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {entry.when} · {entry.actor}
            </span>
            {entry.details ? (
              <span className="text-xs break-words text-muted-foreground">
                {entry.details}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <div className={RESULT_TABLE_CLASS}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{text.auditWhen}</TableHead>
              <TableHead>{text.auditAction}</TableHead>
              {targetLabel === undefined ? null : (
                <TableHead>{targetLabel}</TableHead>
              )}
              <TableHead>{text.auditActor}</TableHead>
              <TableHead>{text.auditDetails}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {entry.when}
                </TableCell>
                <TableCell className="whitespace-normal font-medium">
                  <span className="flex flex-wrap items-center gap-2">
                    {entry.action}
                  </span>
                </TableCell>
                {targetLabel === undefined ? null : (
                  <TableCell className="whitespace-normal break-words">
                    {entry.target}
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground">
                  {entry.actor}
                </TableCell>
                <TableCell className="max-w-md whitespace-normal break-words text-muted-foreground">
                  {entry.details}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
