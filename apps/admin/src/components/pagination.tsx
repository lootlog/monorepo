import { buttonVariants } from "@lootlog/ui/lib/button-variants";
import type { ReactNode } from "react";
import { text } from "@/lib/messages";

const link = buttonVariants({ variant: "outline", size: "sm" });

/**
 * Previous and next links for a paged list. `renderLink` builds the link for a
 * page so each list keeps its own route and filters.
 */
export function Pagination({
  page,
  pageSize,
  total,
  renderLink,
}: {
  page: number;
  pageSize: number;
  total: number;
  renderLink: (page: number, className: string, label: string) => ReactNode;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  if (pages === 1) return null;

  return (
    <nav
      aria-label={text.page(page, pages)}
      className="flex items-center justify-between gap-3"
    >
      <p className="text-sm text-muted-foreground">{text.page(page, pages)}</p>
      <div className="flex gap-2">
        {page > 1 ? renderLink(page - 1, link, text.previousPage) : null}
        {page < pages ? renderLink(page + 1, link, text.nextPage) : null}
      </div>
    </nav>
  );
}
