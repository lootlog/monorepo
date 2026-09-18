import { TableHeader, TableRow } from "@lootlog/ui/components/table";
import type { ReactNode } from "react";

/** Same header treatment as the battle panel lists: pinned, on the page background. */
export const StatsTableHeader = ({ children }: { children: ReactNode }) => (
  <TableHeader className="sticky top-0 z-10 bg-background">
    <TableRow className="border-b-1! border-border hover:bg-transparent">
      {children}
    </TableRow>
  </TableHeader>
);
