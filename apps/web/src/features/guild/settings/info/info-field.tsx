import type { ReactNode } from "react";

type InfoFieldProps = {
  label: string;
  children: ReactNode;
};

export const InfoField = ({ label, children }: InfoFieldProps) => (
  <div className="min-w-0 rounded-lg border border-border/70 bg-background/40 p-3">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="mt-1.5 min-w-0 break-words text-sm font-medium">
      {children}
    </dd>
  </div>
);
