import type { ReactNode } from "react";

/** The line an expanded stats row shows when the warrior has nothing to break down. */
export const BreakdownEmptyMessage = ({
  children,
}: {
  children: ReactNode;
}) => (
  <p className="bg-background p-4 text-sm text-muted-foreground hover:bg-background">
    {children}
  </p>
);
