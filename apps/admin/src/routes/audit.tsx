import { Link, createFileRoute } from "@tanstack/react-router";
import { AuditTable } from "@/components/audit-table";
import { Pagination } from "@/components/pagination";
import { text } from "@/lib/messages";
import { readPage } from "@/lib/users-search";
import { AUDIT_PAGE_SIZE, listAudit } from "@/server/queries";

type AuditSearch = { page?: number | undefined };

export const Route = createFileRoute("/audit")({
  // Returns the key even when empty, or the raw value would stay in place.
  validateSearch: (search: { page?: unknown }): AuditSearch => ({
    page: readPage(search.page),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listAudit({ data: deps.page ?? 1 }),
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
      <div className="rounded-lg border border-border bg-card p-2">
        <AuditTable entries={audit.entries} showTarget />
      </div>
      <Pagination
        page={page}
        pageSize={AUDIT_PAGE_SIZE}
        total={audit.total}
        renderLink={(target, className, label) => (
          <Link
            to="/audit"
            search={{ page: target }}
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
