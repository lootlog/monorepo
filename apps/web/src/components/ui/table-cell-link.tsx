import { Link, type LinkProps } from "@tanstack/react-router";
import { cn } from "cn";
import type { ReactNode } from "react";

type TableCellLinkProps = Pick<LinkProps, "to" | "params"> & {
  /**
   * The row's one keyboard stop; the other cells link to the same place for
   * pointers only, so a row is tabbed once.
   */
  primary: boolean;
  /** Names the destination on the primary link. */
  label?: string;
  className?: string;
  children: ReactNode;
};

/**
 * A table cell's content as a link that fills the cell, so a click anywhere
 * on the row opens it. Give the cell no padding of its own.
 */
export const TableCellLink = ({
  to,
  params,
  primary,
  label,
  className,
  children,
}: TableCellLinkProps) => (
  <Link
    to={to}
    params={params}
    aria-label={primary ? label : undefined}
    title={primary ? label : undefined}
    tabIndex={primary ? 0 : -1}
    className={cn(
      "flex min-h-14 w-full min-w-0 items-center px-2 text-inherit outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
      className,
    )}
  >
    {children}
  </Link>
);
