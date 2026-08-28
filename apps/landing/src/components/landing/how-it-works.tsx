import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { links } from "@/src/config/links";

const steps = ["observe", "sync", "inspect", "decide"] as const;
const stepColors = [
  "bg-[#35d3e4]",
  "bg-[#c8f135]",
  "bg-[#ffbd3f]",
  "bg-[#ff665b]",
] as const;

export function HowItWorks() {
  const { t } = useTranslation();

  return (
    <section
      id="workflow"
      aria-labelledby="workflow-title"
      className="relative isolate overflow-hidden bg-[#07111f] px-5 py-16 text-[#f7f8f2] sm:px-8 sm:py-20 lg:py-28"
    >
      <div className="relative z-10 mx-auto max-w-[90rem]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2
              id="workflow-title"
              className="broadcast-display max-w-4xl text-balance text-4xl font-black leading-[0.98] tracking-[-0.035em] sm:text-6xl"
            >
              {t("landing.workflow.title")}
            </h2>
            <p className="mt-6 max-w-[68ch] text-lg leading-8 text-[#aebed4]">
              {t("landing.workflow.description")}
            </p>
          </div>
          <a
            href={links.docs}
            className="inline-flex min-h-12 shrink-0 items-center gap-2 self-start rounded-xl bg-[#f7f8f2] px-5 text-sm font-bold text-[#07111f] shadow-[8px_12px_28px_rgba(0,0,0,0.2)] transition-[background-color,transform] hover:bg-white motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35d3e4] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f]"
          >
            {t("landing.workflow.guide")}
            <ArrowUpRight className="size-4" />
          </a>
        </div>

        <ol className="relative mt-12 grid gap-0 sm:mt-16 lg:mt-24 lg:grid-cols-4">
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-[12.5%] right-[12.5%] top-8 hidden h-2 rounded-full bg-[#24334a] lg:block"
          />
          {steps.map((step, index) => (
            <li
              key={step}
              className="relative grid grid-cols-[3.5rem_1fr] gap-5 pb-12 last:pb-0 lg:block lg:px-5 lg:pb-0 lg:text-center"
            >
              {index < steps.length - 1 ? (
                <div
                  aria-hidden="true"
                  className="absolute bottom-0 left-[1.55rem] top-14 w-1 rounded-full bg-[#24334a] lg:hidden"
                />
              ) : null}
              <div
                className={[
                  "relative z-10 grid size-14 place-items-center rounded-full text-lg font-black text-[#07111f] shadow-[6px_10px_24px_rgba(0,0,0,0.22)] lg:mx-auto lg:size-16",
                  stepColors[index],
                ].join(" ")}
              >
                {index + 1}
              </div>
              <div className="pt-1 lg:pt-8">
                <p className="text-sm font-bold text-[#91a4bf]">
                  {t(`landing.workflow.steps.${step}.state`)}
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.025em]">
                  {t(`landing.workflow.steps.${step}.title`)}
                </h3>
                <p className="mx-auto mt-3 max-w-[28ch] text-sm leading-6 text-[#aebed4]">
                  {t(`landing.workflow.steps.${step}.description`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
