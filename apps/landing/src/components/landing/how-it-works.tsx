import {
  ArrowUpRight,
  Gamepad2,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { links } from "@/src/config/links";

const steps = [
  { key: "observe", icon: Gamepad2 },
  { key: "sync", icon: RefreshCw },
  { key: "inspect", icon: Search },
  { key: "decide", icon: UsersRound },
] as const;

export function HowItWorks() {
  const { t } = useTranslation();
  return (
    <section
      id="workflow"
      aria-labelledby="workflow-title"
      className="bg-[var(--broadcast-ink)] py-16 text-[var(--broadcast-white)] sm:py-20 lg:py-28"
    >
      <div className="landing-container">
        <div className="grid gap-6 md:grid-cols-2 md:items-end md:gap-12">
          <h2
            id="workflow-title"
            className="landing-heading-section max-w-xl text-balance"
          >
            {t("landing.workflow.title")}
          </h2>
          <p className="max-w-xl text-base leading-7 text-[var(--broadcast-text-muted)]">
            {t("landing.workflow.description")}
          </p>
        </div>
        <ol className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map(({ key, icon: Icon }, index) => (
            <li
              key={key}
              className="rounded-[var(--broadcast-radius-card)] bg-[var(--broadcast-ink-soft)] p-6 sm:p-7"
            >
              <div className="mb-8 flex items-center justify-between">
                <Icon
                  className="size-7 text-[var(--broadcast-cyan)]"
                  aria-hidden="true"
                />
                <span className="font-mono text-sm text-[var(--broadcast-text-subtle)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="text-xs font-semibold text-[var(--broadcast-cyan)]">
                {t(`landing.workflow.steps.${key}.state`)}
              </p>
              <h3 className="mt-2 text-2xl font-bold">
                {t(`landing.workflow.steps.${key}.title`)}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--broadcast-text-muted)]">
                {t(`landing.workflow.steps.${key}.description`)}
              </p>
            </li>
          ))}
        </ol>
        <a
          href={links.docs}
          className="landing-action landing-action-solid mt-6 w-full sm:w-fit"
        >
          {t("landing.workflow.guide")}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
