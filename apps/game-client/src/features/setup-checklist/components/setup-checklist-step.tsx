import { Circle, CircleCheck, LoaderCircle } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { SetupStep } from "@/features/setup-checklist/setup-checklist-steps";

const ICON_CLASS_NAME = "ll:mt-px ll:size-3.5 ll:shrink-0";

const STATUS_ICON = {
  done: (
    <CircleCheck
      aria-hidden
      className={cn(ICON_CLASS_NAME, "ll:text-green-400")}
    />
  ),
  todo: (
    <Circle
      aria-hidden
      className={cn(ICON_CLASS_NAME, "ll:text-foreground/70")}
    />
  ),
  pending: (
    <LoaderCircle
      aria-hidden
      className={cn(
        ICON_CLASS_NAME,
        "ll:text-muted-foreground ll:animate-spin ll:motion-reduce:animate-none",
      )}
    />
  ),
  blocked: (
    <Circle
      aria-hidden
      className={cn(ICON_CLASS_NAME, "ll:text-muted-foreground/50")}
    />
  ),
} as const;

type SetupChecklistStepProps = {
  step: SetupStep;
  onAction: () => void;
};

/**
 * One checklist row: its state (by icon shape and a hidden label, never by
 * color alone), and while it is to do, why it matters and its one action.
 */
export const SetupChecklistStep: FC<SetupChecklistStepProps> = ({
  step,
  onAction,
}) => {
  const { t } = useTranslation("quickAccess");
  const todo = step.status === "todo";

  return (
    <li className="ll:flex ll:items-start ll:gap-2">
      {STATUS_ICON[step.status]}
      <div className="ll:flex ll:min-w-0 ll:flex-1 ll:flex-col ll:gap-0.5">
        <span
          className={cn(
            "ll:leading-4",
            todo
              ? "ll:font-semibold ll:text-foreground/85"
              : "ll:text-muted-foreground",
          )}
        >
          {t(`setup.steps.${step.id}.label`)}
          <span className="ll:sr-only">
            {`, ${t(`setup.status.${step.status}`)}`}
          </span>
        </span>
        {todo ? (
          <span className="ll:text-[11px] ll:leading-4 ll:text-muted-foreground ll:text-pretty">
            {t(`setup.steps.${step.id}.hint`)}
          </span>
        ) : null}
      </div>
      {todo ? (
        <Button
          className="ll:shrink-0"
          onClick={onAction}
          size="xs"
          type="button"
          variant="outline"
        >
          {t(`setup.steps.${step.id}.action`)}
        </Button>
      ) : null}
    </li>
  );
};
