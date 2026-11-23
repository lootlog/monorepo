import { Badge } from "@lootlog/ui/components/badge";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AuditEntries } from "@/components/audit-entries";
import { formatDateTime } from "@/lib/format";
import { auditActionText, text } from "@/lib/messages";
import type { AuditRow } from "@/server/queries";

export function AuditTable({
  entries,
  showTarget,
  empty,
}: {
  entries: ReadonlyArray<AuditRow>;
  showTarget: boolean;
  empty: ReactNode;
}) {
  if (entries.length === 0) return empty;

  return (
    <AuditEntries
      targetLabel={showTarget ? text.auditTarget : undefined}
      entries={entries.map((entry) => ({
        id: entry.id,
        when: formatDateTime(entry.createdAt),
        action: (
          <>
            {auditActionText[entry.action]}
            {entry.incomplete ? (
              <Badge variant="destructive" title={text.auditIncompleteHint}>
                {text.auditIncomplete}
              </Badge>
            ) : null}
          </>
        ),
        target:
          entry.targetUserId !== null && entry.targetName !== null ? (
            <TextLink
              render={
                <Link
                  to="/users/$userId"
                  params={{ userId: entry.targetUserId }}
                />
              }
              className="text-sm"
            >
              {entry.targetName}
            </TextLink>
          ) : (
            <span className="text-muted-foreground">
              {text.auditDeletedUser}
            </span>
          ),
        actor: entry.actor,
        details: entry.details,
      }))}
    />
  );
}
