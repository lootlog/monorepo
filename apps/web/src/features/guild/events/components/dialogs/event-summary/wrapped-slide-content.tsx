import { useTranslation } from "react-i18next";
import type { WrappedFactSlide, WrappedSlide } from "./build-wrapped-slides";
import { formatDurationHuman } from "../../../utils/format-duration";
import { formatHourLabel, formatMetric } from "./utils";

const getFactValue = (fact: WrappedFactSlide): string => {
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

interface WrappedSlideContentProps {
  slide: WrappedSlide;
  eventName: string;
  world: string;
}

export const WrappedSlideContent = ({
  slide,
  eventName,
  world,
}: WrappedSlideContentProps) => {
  const { t } = useTranslation();

  if (slide.kind === "opening") {
    return (
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-center px-6 py-14 sm:px-12">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          {t("events.summaryDialog.eyebrow")}
        </p>
        <h2 className="mt-5 max-w-3xl text-4xl font-bold tracking-[-0.04em] text-balance sm:text-6xl">
          {eventName}
        </h2>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t("events.summaryDialog.openingDescription")}
        </p>
        <p className="mt-8 text-sm font-medium text-foreground/80">{world}</p>
      </div>
    );
  }

  if (slide.kind === "finale") {
    return (
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-center px-6 py-14 sm:px-12">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          {t("events.summaryDialog.finaleEyebrow")}
        </p>
        <h2 className="mt-5 text-4xl font-bold tracking-[-0.04em] sm:text-6xl">
          {t("events.summaryDialog.finaleTitle")}
        </h2>
        <div className="mt-10 divide-y divide-border border-y border-border">
          {slide.highlights.map((fact) => (
            <div
              key={fact.id}
              className="flex items-baseline justify-between gap-6 py-4"
            >
              <span className="text-sm text-muted-foreground">
                {t(`events.summaryDialog.facts.${fact.id}.label`)}
              </span>
              <span className="text-lg font-semibold text-foreground">
                {fact.subject ?? getFactValue(fact)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const displayValue = slide.subject ?? getFactValue(slide);
  const detailValue = getFactValue(slide);

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-center px-6 py-14 sm:px-12">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
        {t(`events.summaryDialog.facts.${slide.id}.label`)}
      </p>
      <p className="mt-5 max-w-full text-[clamp(3rem,10vw,6rem)] font-bold leading-[0.94] tracking-[-0.04em] text-balance">
        {displayValue}
      </p>
      {slide.subject ? (
        <p className="mt-5 text-xl font-semibold text-foreground">
          {t(`events.summaryDialog.facts.${slide.id}.value`, {
            value: detailValue,
          })}
        </p>
      ) : null}
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        {t(`events.summaryDialog.facts.${slide.id}.description`, {
          value: detailValue,
          count: slide.secondaryValue,
        })}
      </p>
    </div>
  );
};
