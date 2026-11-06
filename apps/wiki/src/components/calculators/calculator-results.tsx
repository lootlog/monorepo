import { cn } from "cn";
import { t } from "@/i18n/messages";

type CalculatorResultsProps = {
  /**
   * Each result with its formatted value, the main answer first; none while
   * an input is missing.
   */
  results: ReadonlyArray<{ label: string; value: string | undefined }>;
};

/** A calculator's answers, the main one large, announced as they change. */
export function CalculatorResults({ results }: CalculatorResultsProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t("calculators.resultsTitle")}
      </h3>
      <dl aria-live="polite" className="flex flex-col gap-4">
        {results.map(({ label, value }, index) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd
              className={cn(
                "font-semibold tabular-nums",
                index === 0 ? "text-3xl tracking-tight" : "text-xl",
                value === undefined
                  ? "text-muted-foreground/60"
                  : index === 0
                    ? "text-primary"
                    : "text-foreground",
              )}
            >
              {value ?? t("calculators.noValue")}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
