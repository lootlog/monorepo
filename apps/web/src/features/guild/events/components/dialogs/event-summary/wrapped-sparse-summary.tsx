import { useTranslation } from "react-i18next";
import type { WrappedFactSlide } from "./build-wrapped-slides";
import { formatDurationHuman } from "../../../utils/format-duration";
import { formatHourLabel, formatMetric } from "./utils";

const formatValue = (fact: WrappedFactSlide): string => {
  if (fact.id === "tracked-time" || fact.id === "longest-duty") {
    return formatDurationHuman(fact.value);
  }

  if (fact.id === "busiest-hour") {
    return formatHourLabel(fact.value);
  }

  if (fact.id === "coverage") {
    return `${formatMetric(fact.value)}%`;
  }

  return formatMetric(fact.value);
};

interface WrappedSparseSummaryProps {
  eventName: string;
  facts: WrappedFactSlide[];
}

export const WrappedSparseSummary = ({
  eventName,
  facts,
}: WrappedSparseSummaryProps) => {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col justify-center px-6 py-16 sm:px-12">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
        {t("events.summaryDialog.sparseEyebrow")}
      </p>
      <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-5xl">
        {eventName}
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
        {t("events.summaryDialog.sparseDescription")}
      </p>
      {facts.length > 0 ? (
        <div className="mt-8 divide-y divide-border border-y border-border">
          {facts.map((fact) => (
            <div
              key={fact.id}
              className="flex items-baseline justify-between gap-6 py-4"
            >
              <span className="text-sm text-muted-foreground">
                {t(`events.summaryDialog.facts.${fact.id}.label`)}
              </span>
              <span className="text-xl font-semibold">
                {fact.subject ?? formatValue(fact)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">
          {t("events.summaryDialog.noVerifiedFacts")}
        </p>
      )}
    </div>
  );
};
