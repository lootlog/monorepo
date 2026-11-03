import { Link, type LinkOptions } from "@tanstack/react-router";
import type { ReactNode } from "react";

type TableRowLinkCellProps = {
  link: LinkOptions;
  /** The row's one tab stop; the other cells' links only take the pointer. */
  primary: boolean;
  /** Names the primary link when its cell's text alone would not. */
  label?: string;
  children: ReactNode;
};

/**
 * Fills a table cell with its row's link, so a click anywhere on the row
 * opens it, a middle click opens a new tab, and the keyboard reaches the row
 * once. The cell must be `relative`; its alignment carries over to the
 * content.
 */
export const TableRowLinkCell = ({
  link,
  primary,
  label,
  children,
}: TableRowLinkCellProps) => (
  <Link
    {...link}
    aria-label={primary ? label : undefined}
    tabIndex={primary ? 0 : -1}
    className="grid min-h-10 w-full grid-cols-[minmax(0,1fr)] items-center rounded-sm text-inherit outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
  >
    {children}
  </Link>
);
