import { t } from "@/i18n/messages";

type CalculatorResultsProps = {
  /** Each result with its formatted value; none while an input is missing. */
  results: ReadonlyArray<{ label: string; value: string | undefined }>;
};

/** A calculator's answers, announced as they change. */
export function CalculatorResults({ results }: CalculatorResultsProps) {
  return (
    <dl
      aria-live="polite"
      className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3 rounded-lg bg-muted/40 p-4"
    >
      {results.map(({ label, value }) => (
        <div key={label} className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="text-xl font-semibold text-foreground tabular-nums">
            {value ?? t("calculators.noValue")}
          </dd>
        </div>
      ))}
    </dl>
  );
}
