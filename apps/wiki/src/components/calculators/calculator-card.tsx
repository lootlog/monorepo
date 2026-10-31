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
  /** The card's anchor, which the contents link to. */
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
  children: ReactNode;
};

/**
 * One calculator: what it answers, where its formula comes from, its fields
 * and results, and the formula itself folded away.
 */
export function CalculatorCard({
  id,
  title,
  description,
  source,
  sourceUrl,
  formula,
  actions,
  children,
}: CalculatorCardProps) {
  const SourceIcon = source === "official" ? BookCheck : CircleHelp;

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-20 flex-col gap-4 rounded-xl border border-border/50 bg-card p-5"
    >
      <header className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2
            id={`${id}-title`}
            className="text-base font-semibold text-foreground"
          >
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              source === "official" ? "text-signal-ready" : "text-signal-timer",
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

      {children}

      <Collapsible className="border-t border-border/50 pt-2">
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
