import { Link, createFileRoute } from "@tanstack/react-router";
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

const tab =
  "rounded-control px-3 py-1.5 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:bg-secondary data-[status=active]:text-foreground";

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

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">{text.auditHeading}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {text.auditDescription}
        </p>
      </div>
      <nav aria-label={text.auditHeading} className="flex gap-1">
        {scopeTabs.map((item) => (
          <Link
            key={item.scope}
            to="/audit"
            search={{
              scope:
                item.scope === "organizations" ? "organizations" : undefined,
            }}
            activeOptions={{ explicitUndefined: true }}
            className={tab}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="rounded-lg border border-border bg-card p-2">
        {audit.scope === "organizations" ? (
          <OrganizationAuditTable entries={audit.entries} showOrganization />
        ) : (
          <AuditTable entries={audit.entries} showTarget />
        )}
      </div>
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
    </div>
  );
}
