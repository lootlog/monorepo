import type { AdminOrganizationDetails } from "@lootlog/schema/admin-organizations";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { PageHeader } from "@lootlog/ui/components/page-header";
import { StatsTile } from "@lootlog/ui/components/stats-tile";
import { StatsTileGrid } from "@lootlog/ui/components/stats-tile-grid";
import { StatsTileNumber } from "@lootlog/ui/components/stats-tile-number";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { FactList } from "@/components/fact-list";
import { OrganizationStatusBadge } from "@/components/organization-status-badge";
import { SyncStatusBadge } from "@/components/sync-status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { formatDateTime } from "@/lib/format";
import { text } from "@/lib/messages";

export function OrganizationSummary({
  details,
  webUrl,
}: {
  details: AdminOrganizationDetails;
  webUrl: string;
}) {
  const { organization, usage } = details;
  const limits = details.entitlement.effective;
  const ownerName = organization.owner.name ?? organization.owner.discordId;

  const tiles = [
    { label: text.usageMembers, value: organization.activeMembers },
    { label: text.usageInactiveMembers, value: usage.inactiveMembers },
    { label: text.usageDocuments(limits.documents), value: usage.documents },
    {
      label: text.usageNotificationRules(limits.notificationRules),
      value: usage.notificationRules,
    },
  ];

  return (
    <>
      <PageHeader
        media={
          <UserAvatar
            name={organization.name}
            image={organization.icon}
            className="size-9"
          />
        }
        title={organization.name}
        status={
          <>
            <OrganizationStatusBadge status={organization.status} />
            <SyncStatusBadge
              status={organization.syncStatus}
              hasRequiredPermissions={organization.hasRequiredPermissions}
            />
          </>
        }
        actions={
          organization.status === "active" ? (
            <ChevronLink
              href={new URL(
                `/${organization.vanityUrl ?? organization.id}`,
                webUrl,
              ).toString()}
              target="_blank"
              rel="noreferrer"
            >
              {text.openInLootlog}
            </ChevronLink>
          ) : null
        }
      >
        <FactList
          facts={[
            { label: text.organizationId, value: organization.id },
            {
              label: text.vanityUrl,
              value: organization.vanityUrl ?? text.noVanityUrl,
            },
            {
              label: text.created,
              value: formatDateTime(organization.createdAt),
            },
            {
              label: text.owner,
              value:
                organization.owner.userId === null ? (
                  ownerName
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
                    {ownerName}
                  </TextLink>
                ),
            },
          ]}
        />
      </PageHeader>
      <StatsTileGrid framed className="sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <StatsTile
            key={tile.label}
            label={tile.label}
            value={<StatsTileNumber value={tile.value} />}
          />
        ))}
      </StatsTileGrid>
    </>
  );
}
