import type { ReactNode } from "react";

export function FactList({
  facts,
}: {
  facts: ReadonlyArray<{ readonly label: string; readonly value: ReactNode }>;
}) {
  return (
    <dl className="grid gap-x-6 gap-y-2 border-t border-border/70 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      {facts.map((fact) => (
        <div key={fact.label} className="grid min-w-0">
          <dt className="text-xs text-muted-foreground">{fact.label}</dt>
          <dd className="break-all">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
