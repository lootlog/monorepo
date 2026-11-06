import type { ReactNode } from "react";
import { BookCheck, ChevronDown, CircleHelp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";
import { TextLink } from "@lootlog/ui/components/text-link";
import { cn } from "cn";
import { t } from "@/i18n/messages";
import type { FormulaSource } from "@/lib/calculators";

type CalculatorCardProps = {
  id: string;
  title: string;
  description: string;
  source: FormulaSource;
  /** The documentation page an official formula comes from. */
  sourceUrl?: string;
  /** How the result is computed, folded under the card. */
  formula: string;
  /** Actions beside the title, such as filling the fields from the set. */
  actions?: ReactNode;
  /** The answers, beside the fields where there is room. */
  results: ReactNode;
  /** The fields. */
  children: ReactNode;
};

/**
 * One calculator: what it answers and where its formula comes from, its
 * fields beside its results, and the formula itself folded away.
 */
export function CalculatorCard({
  id,
  title,
  description,
  source,
  sourceUrl,
  formula,
  actions,
  results,
  children,
}: CalculatorCardProps) {
  const SourceIcon = source === "official" ? BookCheck : CircleHelp;

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 p-5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2
            id={`${id}-title`}
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          <p className="text-sm text-pretty text-muted-foreground">
            {description}
          </p>
          <p
            className={cn(
              "mt-1 flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
              source === "official"
                ? "bg-signal-ready/10 text-signal-ready"
                : "bg-signal-timer/10 text-signal-timer",
            )}
            title={
              source === "community"
                ? t("calculators.communityDescription")
                : undefined
            }
          >
            <SourceIcon aria-hidden="true" className="size-3.5 shrink-0" />
            {t(`calculators.${source}`)}
          </p>
        </div>
        {actions}
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-4 p-5">{children}</div>
        <div className="border-t border-border/50 bg-background/40 p-5 lg:border-t-0 lg:border-l">
          {results}
        </div>
      </div>

      <Collapsible className="border-t border-border/50 px-4 py-1.5">
        <CollapsibleTrigger className="group/formula flex h-9 items-center gap-2 rounded-md px-1 text-left text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 -rotate-90 text-muted-foreground transition-[rotate] duration-200 ease-out group-data-panel-open/formula:rotate-0 motion-reduce:transition-none"
          />
          {t("calculators.howItWorks")}
        </CollapsibleTrigger>
        <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
          <div className="flex flex-col gap-2 px-1 pt-1 pb-2 text-sm text-muted-foreground">
            <p className="text-pretty">{formula}</p>
            {source === "official" && sourceUrl ? (
              <TextLink
                className="text-sm"
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("calculators.sourceLink")}
              </TextLink>
            ) : (
              <p>{t("calculators.communityDescription")}</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
