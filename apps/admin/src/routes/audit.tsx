import { EmptyState } from "@lootlog/ui/components/empty-state";
import { HorizontalMenu } from "@lootlog/ui/components/horizontal-menu";
import { PageHeader } from "@lootlog/ui/components/page-header";
import { PortalNavLink } from "@lootlog/ui/components/portal-nav-link";
import { SectionCard } from "@lootlog/ui/components/section-card";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { Option, Schema } from "effect";
import { AuditTable } from "@/components/audit-table";
import { OrganizationAuditTable } from "@/components/organization-audit-table";
import { Pagination } from "@/components/pagination";
import { text } from "@/lib/messages";
import { readPage } from "@/lib/search-params";
import {
  ORGANIZATION_AUDIT_PAGE_SIZE,
  listOrganizationAudit,
} from "@/server/organizations";
import { AUDIT_PAGE_SIZE, listAudit } from "@/server/queries";

type AuditScope = "users" | "organizations";

type AuditSearch = {
  scope?: "organizations" | undefined;
  page?: number | undefined;
};

const readScope = Schema.decodeUnknownOption(Schema.Literal("organizations"));

const scopeTabs: ReadonlyArray<{
  readonly scope: AuditScope;
  readonly label: string;
}> = [
  { scope: "users", label: text.auditScopeUsers },
  { scope: "organizations", label: text.auditScopeOrganizations },
];

export const Route = createFileRoute("/audit")({
  validateSearch: (search: {
    scope?: unknown;
    page?: unknown;
  }): AuditSearch => ({
    scope: Option.getOrUndefined(readScope(search.scope)),
    page: readPage(search.page),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) =>
    deps.scope === "organizations"
      ? {
          scope: "organizations" as const,
          ...(await listOrganizationAudit({ data: deps.page ?? 1 })),
        }
      : {
          scope: "users" as const,
          ...(await listAudit({ data: deps.page ?? 1 })),
        },
  component: AuditPage,
});

function AuditPage() {
  const audit = Route.useLoaderData();
  const { page = 1 } = Route.useSearch();
  const empty = <EmptyState icon={ScrollText} title={text.auditEmpty} />;

  return (
    <>
      <PageHeader
        icon={ScrollText}
        title={text.auditHeading}
        description={text.auditDescription}
      />
      <SectionCard>
        <HorizontalMenu
          aria-label={text.auditHeading}
          className="h-11 border-b border-sidebar-border"
        >
          {scopeTabs.map((item) => (
            <li key={item.scope}>
              <PortalNavLink
                variant="bar"
                active={item.scope === audit.scope}
                className="after:inset-y-2"
                render={
                  <Link
                    to="/audit"
                    search={{
                      scope:
                        item.scope === "organizations"
                          ? "organizations"
                          : undefined,
                    }}
                    activeOptions={{ explicitUndefined: true }}
                  />
                }
              >
                {item.label}
              </PortalNavLink>
            </li>
          ))}
        </HorizontalMenu>
        {audit.scope === "organizations" ? (
          <OrganizationAuditTable
            entries={audit.entries}
            showOrganization
            empty={empty}
          />
        ) : (
          <AuditTable entries={audit.entries} showTarget empty={empty} />
        )}
        <Pagination
          page={page}
          pageSize={
            audit.scope === "organizations"
              ? ORGANIZATION_AUDIT_PAGE_SIZE
              : AUDIT_PAGE_SIZE
          }
          total={audit.total}
          renderLink={(target, className, label) => (
            <Link
              to="/audit"
              search={(previous) => ({ ...previous, page: target })}
              className={className}
              key={label}
            >
              {label}
            </Link>
          )}
        />
      </SectionCard>
    </>
  );
}
