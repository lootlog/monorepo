import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Option, Schema } from "effect";
import { OrganizationAuditTable } from "@/components/organization-audit-table";
import { OrganizationDiscord } from "@/components/organization-discord";
import { OrganizationLimitsForm } from "@/components/organization-limits-form";
import { OrganizationMembers } from "@/components/organization-members";
import { OrganizationNotifications } from "@/components/organization-notifications";
import { OrganizationRoles } from "@/components/organization-roles";
import { OrganizationSummary } from "@/components/organization-summary";
import { OrganizationSuspension } from "@/components/organization-suspension";
import { OrganizationVanityUrl } from "@/components/organization-vanity-url";
import { Section } from "@/components/section";
import { organizationNoticeText, text } from "@/lib/messages";
import type { OrganizationAction } from "@/lib/organization-action";
import { readPage, readText } from "@/lib/search-params";
import { getOrganization } from "@/server/organizations";
import { getWebUrl } from "@/server/queries";

type OrganizationPageSearch = {
  notice?: OrganizationAction["action"] | undefined;
  error?: "failed" | "cooldown" | undefined;
  members?: string | undefined;
  page?: number | undefined;
};

const readNotice = Schema.decodeUnknownOption(
  Schema.Literals([
    "limits",
    "clear-vanity-url",
    "refresh-discord-sync",
    "suspend",
    "resume",
  ]) satisfies Schema.Codec<OrganizationAction["action"]>,
);

const readError = Schema.decodeUnknownOption(
  Schema.Literals(["failed", "cooldown"]),
);

export const Route = createFileRoute("/organizations/$guildId")({
  validateSearch: (search: {
    notice?: unknown;
    error?: unknown;
    members?: unknown;
    page?: unknown;
  }): OrganizationPageSearch => ({
    notice: Option.getOrUndefined(readNotice(search.notice)),
    error: Option.getOrUndefined(readError(search.error)),
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
  component: OrganizationPage,
});

function OrganizationPage() {
  const { details, members, webUrl } = Route.useLoaderData();
  const { notice, error, members: memberSearch, page } = Route.useSearch();
  const { organization } = details;

  return (
    <>
      <Link
        to="/organizations"
        className="self-start rounded-control text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← {text.backToOrganizations}
      </Link>
      {notice ? (
        <Alert variant="ready" role="status">
          <AlertDescription>{organizationNoticeText[notice]}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {error === "cooldown" ? text.discordCooldown : text.actionFailed}
          </AlertDescription>
        </Alert>
      ) : null}
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
          id="limits"
          title={text.limitsHeading}
          description={text.limitsDescription}
        >
          <OrganizationLimitsForm
            key={`${details.limits.documentLimit}:${details.limits.notificationRuleLimit}`}
            guildId={organization.id}
            limits={details.limits}
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
      >
        <OrganizationRoles roles={details.roles} />
      </Section>
      <Section id="members" title={text.membersHeading}>
        <OrganizationMembers
          guildId={organization.id}
          members={members}
          search={memberSearch}
          page={page ?? 1}
        />
      </Section>
      <Section id="history" title={text.organizationAuditHeading}>
        <OrganizationAuditTable
          entries={details.audit}
          showOrganization={false}
        />
      </Section>
    </>
  );
}
