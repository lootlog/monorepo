import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { SetupChecklistStep } from "@/features/setup-checklist/components/setup-checklist-step";
import type {
  SetupStep,
  SetupStepId,
} from "@/features/setup-checklist/setup-checklist-steps";

type SetupChecklistProps = {
  steps: SetupStep[];
  remaining: number;
  onAction: (stepId: SetupStepId) => void;
  onDismiss: () => void;
};

/** The steps a new player takes before Lootlog works for this character. */
export const SetupChecklist: FC<SetupChecklistProps> = ({
  steps,
  remaining,
  onAction,
  onDismiss,
}) => {
  const { t } = useTranslation("quickAccess");

  return (
    <div className="ll:flex ll:flex-col ll:gap-2.5 ll:text-xs">
      <div className="ll:flex ll:items-baseline ll:justify-between ll:gap-2">
        <span className="ll:font-semibold">{t("setup.title")}</span>
        <span className="ll:text-[11px] ll:tabular-nums ll:text-muted-foreground">
          {t("setup.progress", {
            done: steps.length - remaining,
            total: steps.length,
          })}
        </span>
      </div>
      <ol
        aria-label={t("setup.listLabel")}
        className="ll:m-0 ll:flex ll:list-none ll:flex-col ll:gap-2 ll:p-0"
      >
        {steps.map((step) => (
          <SetupChecklistStep
            key={step.id}
            step={step}
            onAction={() => onAction(step.id)}
          />
        ))}
      </ol>
      <div className="ll:flex ll:items-center ll:justify-between ll:gap-2 ll:border-0 ll:border-t ll:border-border ll:pt-2">
        <span className="ll:text-[11px] ll:leading-4 ll:text-muted-foreground ll:text-pretty">
          {t("setup.dismissHint")}
        </span>
        <Button
          className="ll:shrink-0"
          onClick={onDismiss}
          size="xs"
          type="button"
          variant="ghost"
        >
          {t("setup.dismiss")}
        </Button>
      </div>
    </div>
  );
};
