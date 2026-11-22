import { Link, type LinkProps } from "@tanstack/react-router";
import { cn } from "cn";
import type { ReactNode } from "react";

type TableCellLinkProps = Pick<LinkProps, "to" | "params"> & {
  primary: boolean;
  label?: string;
  className?: string;
  children: ReactNode;
};

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
