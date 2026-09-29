import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Blocks, ExternalLink, ListChecks, PlusCircle, X } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { GETTING_STARTED_DOCS_URL } from "@/config/addon";
import { MARGONEM_URL } from "@/constants/margonem";
import { useGlobalContext } from "@/hooks/context/use-global-context";
import type {
  OnboardingStepId,
  OnboardingStepStatus,
} from "./onboarding-steps";
import { DashboardOnboardingStep } from "./dashboard-onboarding-step";
import { useDashboardOnboarding } from "./use-dashboard-onboarding";

const TITLE_ID = "dashboard-onboarding-title";

export const DashboardOnboarding = () => {
  const { t } = useTranslation();
  const { installAddonModal, createGuildModal } = useGlobalContext();
  const steps = useDashboardOnboarding();

  // Recorded activity is the only completion signal, so a player whose kills
  // and battles never reach Lootlog needs a way to put the checklist away.
  const [dismissed, setDismissed] = useLocalStorage(
    "lootlog:dashboard:onboarding-dismissed",
    false,
  );

  if (!steps || dismissed) return null;

  const buttonVariant = (status: OnboardingStepStatus) =>
    status === "current" ? "default" : "outline";

  const actions: Record<
    OnboardingStepId,
    (status: OnboardingStepStatus) => ReactNode
  > = {
    installAddon: (status) => (
      <Button
        variant={buttonVariant(status)}
        onClick={() => installAddonModal.dispatch({ type: "OPEN" })}
      >
        <Blocks aria-hidden="true" />
        {t("statistics.onboarding.steps.installAddon.action")}
      </Button>
    ),
    joinOrganization: (status) => (
      <Button
        variant={buttonVariant(status)}
        onClick={() => createGuildModal.dispatch({ type: "OPEN" })}
      >
        <PlusCircle aria-hidden="true" />
        {t("statistics.onboarding.steps.joinOrganization.action")}
      </Button>
    ),
    catchingScope: (status) => (
      <Button
        variant={buttonVariant(status)}
        nativeButton={false}
        render={
          <a href={MARGONEM_URL} target="_blank" rel="noopener noreferrer" />
        }
      >
        <ExternalLink aria-hidden="true" />
        {t("statistics.onboarding.steps.catchingScope.action")}
        <span className="sr-only">{t("ui.externalLink.newTab")}</span>
      </Button>
    ),
  };

  return (
    <section aria-labelledby={TITLE_ID} className="shrink-0">
      <SectionCard className="@container/onboarding">
        <SectionCardHeader
          id={TITLE_ID}
          icon={ListChecks}
          title={t("statistics.onboarding.title")}
          description={t("statistics.onboarding.description")}
          actions={
            <>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      aria-label={t("statistics.onboarding.dismiss")}
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => setDismissed(true)}
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </Button>
                  }
                />
                <TooltipContent>
                  {t("statistics.onboarding.dismiss")}
                </TooltipContent>
              </Tooltip>
              <ChevronLink
                href={GETTING_STARTED_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("statistics.onboarding.guide")}
                <span className="sr-only">{t("ui.externalLink.newTab")}</span>
              </ChevronLink>
            </>
          }
        />
        <SectionCardContent className="p-3 @min-[1000px]/onboarding:p-4">
          <ol className="grid gap-3 @min-[800px]/onboarding:grid-cols-3">
            {steps.map((step, index) => (
              <DashboardOnboardingStep
                key={step.id}
                number={index + 1}
                status={step.status}
                title={t(`statistics.onboarding.steps.${step.id}.title`)}
                description={t(
                  `statistics.onboarding.steps.${step.id}.description`,
                )}
                action={actions[step.id](step.status)}
              />
            ))}
          </ol>
        </SectionCardContent>
      </SectionCard>
    </section>
  );
};
