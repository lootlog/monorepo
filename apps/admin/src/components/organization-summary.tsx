import type { AdminOrganizationDetails } from "@lootlog/schema/admin-organizations";
import { Link } from "@tanstack/react-router";
import { OrganizationStatusBadge } from "@/components/organization-status-badge";
import { StatTiles } from "@/components/stat-tiles";
import { SyncStatusBadge } from "@/components/sync-status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { formatDateTime } from "@/lib/format";
import { text } from "@/lib/messages";

const link =
  "rounded-control underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function OrganizationSummary({
  details,
  webUrl,
}: {
  details: AdminOrganizationDetails;
  webUrl: string;
}) {
  const { organization, usage } = details;
  const limits = details.entitlement.effective;

  const facts = [
    { label: text.organizationId, value: organization.id },
    {
      label: text.vanityUrl,
      value: organization.vanityUrl ?? text.noVanityUrl,
    },
    { label: text.created, value: formatDateTime(organization.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <UserAvatar name={organization.name} image={organization.icon} />
        <h1 className="min-w-0 break-words text-xl font-semibold">
          {organization.name}
        </h1>
        <OrganizationStatusBadge status={organization.status} />
        <SyncStatusBadge
          status={organization.syncStatus}
          hasRequiredPermissions={organization.hasRequiredPermissions}
        />
        {organization.status === "active" ? (
          <a
            href={new URL(
              `/${organization.vanityUrl ?? organization.id}`,
              webUrl,
            ).toString()}
            target="_blank"
            rel="noreferrer"
            className={`ml-auto text-sm ${link}`}
          >
            {text.openInLootlog}
          </a>
        ) : null}
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="grid min-w-0">
            <dt className="text-xs text-muted-foreground">{fact.label}</dt>
            <dd className="break-all">{fact.value}</dd>
          </div>
        ))}
        <div className="grid min-w-0">
          <dt className="text-xs text-muted-foreground">{text.owner}</dt>
          <dd className="break-all">
            {organization.owner.userId === null ? (
              (organization.owner.name ?? organization.owner.discordId)
            ) : (
              <Link
                to="/users/$userId"
                params={{ userId: organization.owner.userId }}
                className={link}
              >
                {organization.owner.name ?? organization.owner.discordId}
              </Link>
            )}
          </dd>
        </div>
      </dl>
      <StatTiles
        tiles={[
          { label: text.usageMembers, value: organization.activeMembers },
          { label: text.usageInactiveMembers, value: usage.inactiveMembers },
          { label: text.usageLootsLastMonth, value: usage.lootsLastMonth },
          {
            label: text.usageDocuments(limits.documents),
            value: usage.documents,
          },
          {
            label: text.usageNotificationRules(limits.notificationRules),
            value: usage.notificationRules,
          },
        ]}
      />
    </div>
  );
}
