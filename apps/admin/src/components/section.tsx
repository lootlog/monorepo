import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { SectionCard } from "@lootlog/ui/components/section-card";
import { SectionCardContent } from "@lootlog/ui/components/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { cn } from "cn";
import { useState, type ReactNode } from "react";
import {
  SectionOutcomeContext,
  type SectionOutcome,
} from "@/lib/section-outcome";

export function Section({
  id,
  title,
  description,
  flush = false,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  flush?: boolean;
  children: ReactNode;
}) {
  const [outcome, setOutcome] = useState<
    SectionOutcome & { readonly count: number }
  >();

  const report = (next: SectionOutcome) =>
    setOutcome((current) => ({ ...next, count: (current?.count ?? 0) + 1 }));

  return (
    <section aria-labelledby={id} className="min-w-0">
      <SectionCard>
        {outcome?.tone === "ready" ? (
          <span
            key={outcome.count}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] animate-arrival motion-reduce:animate-none"
          />
        ) : null}
        <SectionCardHeader id={id} title={title} description={description} />
        <div role="status" className="p-3 pb-0 empty:hidden">
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
          <SectionCardContent className={cn(flush && "p-0")}>
            {children}
          </SectionCardContent>
        </SectionOutcomeContext>
      </SectionCard>
    </section>
  );
}
