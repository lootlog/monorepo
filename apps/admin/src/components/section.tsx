import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { useState, type ReactNode } from "react";
import {
  SectionOutcomeContext,
  type SectionOutcome,
} from "@/lib/section-outcome";

export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const [outcome, setOutcome] = useState<
    SectionOutcome & { readonly count: number }
  >();

  const report = (next: SectionOutcome) =>
    setOutcome((current) => ({ ...next, count: (current?.count ?? 0) + 1 }));

  return (
    <section
      aria-labelledby={id}
      className="relative rounded-lg border border-border bg-card"
    >
      {outcome?.tone === "ready" ? (
        <span
          key={outcome.count}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] animate-arrival motion-reduce:animate-none"
        />
      ) : null}
      <div className="border-b border-border px-4 py-3 md:px-5">
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-4 px-4 py-4 md:px-5">
        <div role="status" className="empty:hidden">
          {outcome ? (
            <Alert
              key={outcome.count}
              role="none"
              variant={outcome.tone}
              className="animate-rise-in motion-reduce:animate-none"
            >
              <AlertDescription>{outcome.message}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <SectionOutcomeContext value={report}>
          <div>{children}</div>
        </SectionOutcomeContext>
      </div>
    </section>
  );
}
