import {
  ArrowUpRight,
  Download,
  Gamepad2,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { SectionHead } from "@/src/components/landing/section-head";
import { links } from "@/src/config/links";

const steps = [
  { key: "install", icon: Download, tone: "lime" },
  { key: "play", icon: Gamepad2, tone: "cyan" },
  { key: "sync", icon: RefreshCw, tone: "amber" },
  { key: "plan", icon: UsersRound, tone: "coral" },
] as const;

export function HowItWorks() {
  const { t } = useTranslation();

  return (
    <section
      id="workflow"
      aria-labelledby="workflow-title"
      className="landing-section bg-[var(--broadcast-ink)] text-[var(--broadcast-white)]"
    >
      <div className="landing-container">
        <SectionHead
          id="workflow-title"
          title={t("landing.workflow.title")}
          description={t("landing.workflow.description")}
        />
        <ol className="landing-steps">
          {steps.map(({ key, icon: Icon, tone }, index) => (
            <li key={key} className={`landing-step landing-tone-${tone}`}>
              <span className="landing-step-badge">
                <Icon className="size-7" aria-hidden="true" />
                <span className="landing-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </span>
              <h3>{t(`landing.workflow.steps.${key}.title`)}</h3>
              <p>{t(`landing.workflow.steps.${key}.description`)}</p>
            </li>
          ))}
        </ol>
        <a
          href={links.installationGuide}
          className="landing-action landing-action-solid mt-12 w-full sm:w-fit lg:mt-14"
        >
          {t("landing.workflow.guide")}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
