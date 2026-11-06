import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { t } from "@/i18n/messages";
import {
  CALCULATOR_GROUPS,
  type CalculatorId,
} from "@/components/calculators/calculator-list";

/**
 * The calculators by topic. From `lg` a list beside the open calculator;
 * narrower screens scroll it sideways above it.
 */
export function CalculatorNav({ current }: { current: CalculatorId }) {
  return (
    <nav aria-label={t("calculators.contents")}>
      <div className="-mx-4 flex gap-6 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-6 md:px-6 lg:mx-0 lg:flex-col lg:gap-5 lg:overflow-visible lg:px-0">
        {CALCULATOR_GROUPS.map(({ titleKey, calculators }) => (
          <section key={titleKey} className="flex shrink-0 flex-col gap-1.5">
            <h2 className="px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t(titleKey)}
            </h2>
            <ul className="flex gap-1 lg:flex-col">
              {calculators.map(({ id, titleKey: labelKey, icon: Icon }) => {
                const isCurrent = id === current;

                return (
                  <li key={id}>
                    <Link
                      to="/calculators"
                      search={{ calculator: id }}
                      aria-current={isCurrent ? "page" : undefined}
                      className={cn(
                        "flex min-h-9 items-center gap-2.5 rounded-md px-2 py-1.5 text-sm whitespace-nowrap outline-none lg:whitespace-normal transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                        isCurrent
                          ? "bg-primary/12 font-semibold text-primary"
                          : "font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      {t(labelKey)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}
