import { Badge } from "@lootlog/ui/components/badge";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { STATS_TILE_CELL_CLASS } from "@/components/common/stats-tile";
import type { OnboardingStepStatus } from "./onboarding-steps";

type DashboardOnboardingStepProps = {
  number: number;
  status: OnboardingStepStatus;
  title: string;
  description: ReactNode;
  action: ReactNode;
};

export const DashboardOnboardingStep = ({
  number,
  status,
  title,
  description,
  action,
}: DashboardOnboardingStepProps) => {
  const { t } = useTranslation();
  const isDone = status === "done";

  return (
    <li
      className={cn(
        "flex flex-col gap-4 p-4",
        STATS_TILE_CELL_CLASS,
        status === "current" && "bg-primary/5",
      )}
      aria-current={status === "current" ? "step" : undefined}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold tabular-nums",
            isDone
              ? "bg-signal-ready/10 text-signal-ready"
              : "bg-primary/10 text-primary",
          )}
        >
          {isDone ? <Check className="size-4" /> : number}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="min-w-0 text-sm font-semibold">
              <span className="sr-only">
                {t("statistics.onboarding.stepNumber", { number })}
              </span>
              {title}
            </h3>
            {status === "current" && (
              <Badge variant="outline">
                {t("statistics.onboarding.status.current")}
              </Badge>
            )}
            {isDone && (
              <Badge variant="ready">
                {t("statistics.onboarding.status.done")}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {!isDone && <div className="mt-auto flex">{action}</div>}
    </li>
  );
};
