import { Link, type LinkOptions } from "@tanstack/react-router";
import { cn } from "cn";
import type { ReactNode } from "react";

type TableRowLinkCellProps = {
  link: LinkOptions;
  /** The row's one tab stop; the other cells' links only take the pointer. */
  primary: boolean;
  /** Names the primary link when its cell's text alone would not. */
  label?: string;
  /**
   * Stretches the content over the cell, so a cell's centred or
   * right-aligned content keeps its alignment.
   */
  fill?: boolean;
  children: ReactNode;
};

/**
 * Fills a table cell with its row's link, so a click anywhere on the row
 * opens it, a middle click opens a new tab, and the keyboard reaches the row
 * once. The cell must be `relative`.
 */
export const TableRowLinkCell = ({
  link,
  primary,
  label,
  fill = false,
  children,
}: TableRowLinkCellProps) => (
  <Link
    {...link}
    aria-label={primary ? label : undefined}
    tabIndex={primary ? 0 : -1}
    className={cn(
      "w-full items-center rounded-sm text-inherit outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
      // Filling keeps the row at its text height; the link still covers it.
      fill ? "grid grid-cols-[minmax(0,1fr)]" : "flex min-h-10",
    )}
  >
    {children}
  </Link>
);
