import { EmptyState } from "@lootlog/ui/components/empty-state";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { OrganizationAuditTable } from "@/components/organization-audit-table";
import { OrganizationDiscord } from "@/components/organization-discord";
import { OrganizationMembers } from "@/components/organization-members";
import { OrganizationNotifications } from "@/components/organization-notifications";
import { OrganizationPlanForm } from "@/components/organization-plan-form";
import { OrganizationRoles } from "@/components/organization-roles";
import { OrganizationSummary } from "@/components/organization-summary";
import { OrganizationSuspension } from "@/components/organization-suspension";
import { OrganizationVanityUrl } from "@/components/organization-vanity-url";
import { Section } from "@/components/section";
import { text } from "@/lib/messages";
import { readPage, readText } from "@/lib/search-params";
import { getOrganization } from "@/server/organizations";
import { getWebUrl } from "@/server/queries";

type OrganizationPageSearch = {
  members?: string | undefined;
  page?: number | undefined;
};

export const Route = createFileRoute("/organizations/$guildId")({
  validateSearch: (search: {
    members?: unknown;
    page?: unknown;
  }): OrganizationPageSearch => ({
    members: readText(search.members),
    page: readPage(search.page),
  }),
  loaderDeps: ({ search }) => ({ members: search.members, page: search.page }),
  loader: async ({ params, deps }) => {
    const [organization, webUrl] = await Promise.all([
      getOrganization({
        data: {
          guildId: params.guildId,
          memberSearch: deps.members,
          memberPage: deps.page ?? 1,
        },
      }),
      getWebUrl(),
    ]);

    return { ...organization, webUrl };
  },
  remountDeps: ({ params }) => params.guildId,
  component: OrganizationPage,
});

function OrganizationPage() {
  const { details, members, webUrl } = Route.useLoaderData();
  const { members: memberSearch, page } = Route.useSearch();
  const { organization } = details;

  return (
    <>
      <BackLink render={<Link to="/organizations" />}>
        {text.backToOrganizations}
      </BackLink>
      <OrganizationSummary details={details} webUrl={webUrl} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          id="suspension"
          title={text.suspensionHeading}
          description={text.suspensionDescription}
        >
          <OrganizationSuspension
            key={details.suspension?.at ?? "active"}
            details={details}
          />
        </Section>
        <Section
          id="plan"
          title={text.planHeading}
          description={text.planOrganizationDescription}
        >
          <OrganizationPlanForm
            key={details.entitlement.changed?.at ?? "default"}
            guildId={organization.id}
            entitlement={details.entitlement}
          />
        </Section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          id="discord"
          title={text.discordHeading}
          description={text.discordDescription}
        >
          <OrganizationDiscord
            guildId={organization.id}
            discord={details.discord}
          />
        </Section>
        <div className="flex flex-col gap-6">
          <Section
            id="vanity"
            title={text.vanityHeading}
            description={text.vanityDescription}
          >
            <OrganizationVanityUrl
              guildId={organization.id}
              vanityUrl={organization.vanityUrl}
            />
          </Section>
          <Section id="notifications" title={text.notificationsHeading}>
            <OrganizationNotifications notifications={details.notifications} />
          </Section>
        </div>
      </div>
      <Section
        id="roles"
        title={text.rolesListHeading}
        description={text.rolesListDescription}
        flush
      >
        <OrganizationRoles roles={details.roles} />
      </Section>
      <Section id="members" title={text.membersHeading} flush>
        <OrganizationMembers
          guildId={organization.id}
          members={members}
          search={memberSearch}
          page={page ?? 1}
        />
      </Section>
      <Section id="history" title={text.organizationAuditHeading} flush>
        <OrganizationAuditTable
          entries={details.audit}
          showOrganization={false}
          empty={
            <EmptyState compact icon={ScrollText} title={text.auditEmpty} />
          }
        />
      </Section>
    </>
  );
}
