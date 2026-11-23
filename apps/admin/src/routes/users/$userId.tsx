import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ApiKeysList } from "@/components/api-keys-list";
import { AuraGrants } from "@/components/aura-grants";
import { AuditTable } from "@/components/audit-table";
import { BanForm } from "@/components/ban-form";
import { RolesForm } from "@/components/roles-form";
import { Section } from "@/components/section";
import { SessionsList } from "@/components/sessions-list";
import { UserOrganizations } from "@/components/user-organizations";
import { UserSummary } from "@/components/user-summary";
import { text } from "@/lib/messages";
import { getUser } from "@/server/queries";

export const Route = createFileRoute("/users/$userId")({
  loader: ({ params }) => getUser({ data: params.userId }),
  remountDeps: ({ params }) => params.userId,
  component: UserPage,
});

function UserPage() {
  const { user, sessions, apiKeys, audit, auras, organizations } =
    Route.useLoaderData();

  const { operator } = Route.useRouteContext();

  return (
    <>
      <Link
        to="/"
        className="self-start rounded-control text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← {text.backToUsers}
      </Link>
      <UserSummary user={user} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          id="roles"
          title={text.rolesHeading}
          description={text.rolesDescription}
        >
          <RolesForm
            key={user.roles.join()}
            userId={user.id}
            roles={user.roles}
          />
        </Section>
        <Section
          id="ban"
          title={text.banHeading}
          description={text.banDescription}
        >
          <BanForm user={user} own={operator?.userId === user.id} />
        </Section>
      </div>
      <Section
        id="auras"
        title={text.aurasHeading}
        description={text.aurasDescription}
      >
        {auras.status === "ok" ? (
          <AuraGrants user={user} grants={auras.value} />
        ) : (
          <Alert variant="destructive">
            <AlertDescription>{text.aurasUnavailable}</AlertDescription>
          </Alert>
        )}
      </Section>
      <Section id="organizations" title={text.userOrganizationsHeading}>
        {organizations.status === "ok" ? (
          <UserOrganizations organizations={organizations.value} />
        ) : (
          <Alert variant="destructive">
            <AlertDescription>
              {text.userOrganizationsUnavailable}
            </AlertDescription>
          </Alert>
        )}
      </Section>
      <Section
        id="sessions"
        title={text.sessionsHeading}
        description={text.sessionsDescription}
      >
        <SessionsList user={user} sessions={sessions} />
      </Section>
      <Section id="api-keys" title={text.apiKeysHeading}>
        <ApiKeysList userId={user.id} apiKeys={apiKeys} />
      </Section>
      <Section id="history" title={text.auditUserHeading}>
        <AuditTable entries={audit} showTarget={false} />
      </Section>
    </>
  );
}
