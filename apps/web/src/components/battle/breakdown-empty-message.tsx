import type { ReactNode } from "react";

export const BreakdownEmptyMessage = ({
  children,
}: {
  children: ReactNode;
}) => (
  <p className="bg-background p-4 text-sm text-muted-foreground hover:bg-background">
    {children}
  </p>
);
