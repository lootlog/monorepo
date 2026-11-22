import type { ReactNode } from "react";

type DetailFieldProps = {
  label: string;
  children: ReactNode;
};

export const DetailField = ({ label, children }: DetailFieldProps) => (
  <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[minmax(8rem,0.75fr)_minmax(0,1fr)] sm:items-center sm:gap-3">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="min-w-0 text-sm font-medium break-words">{children}</dd>
  </div>
);
