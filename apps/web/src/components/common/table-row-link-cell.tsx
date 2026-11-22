import { Link, type LinkOptions } from "@tanstack/react-router";
import { cn } from "cn";
import type { ReactNode } from "react";

type TableRowLinkCellProps = {
  link: LinkOptions;
  primary: boolean;
  label?: string;
  fill?: boolean;
  children: ReactNode;
};

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
      fill ? "grid grid-cols-[minmax(0,1fr)]" : "flex min-h-10",
    )}
  >
    {children}
  </Link>
);
