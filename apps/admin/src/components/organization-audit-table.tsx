import type { OrganizationAuditEntry } from "@lootlog/schema/admin-organizations";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AuditEntries } from "@/components/audit-entries";
import { formatAuditDetails } from "@/lib/audit-details";
import { formatDateTime } from "@/lib/format";
import { organizationAuditActionText, text } from "@/lib/messages";

export function OrganizationAuditTable({
  entries,
  showOrganization,
  empty,
}: {
  entries: ReadonlyArray<OrganizationAuditEntry>;
  showOrganization: boolean;
  empty: ReactNode;
}) {
  if (entries.length === 0) return empty;

  return (
    <AuditEntries
      targetLabel={showOrganization ? text.auditOrganization : undefined}
      entries={entries.map((entry) => ({
        id: entry.id,
        when: formatDateTime(entry.createdAt),
        action: organizationAuditActionText[entry.action],
        target: (
          <TextLink
            render={
              <Link
                to="/organizations/$guildId"
                params={{ guildId: entry.organizationId }}
              />
            }
            className="text-sm"
          >
            {entry.organizationName}
          </TextLink>
        ),
        actor: entry.actor,
        details: formatAuditDetails(entry.details),
      }))}
    />
  );
}
