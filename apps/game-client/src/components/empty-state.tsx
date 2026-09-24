import type { FC } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  description?: string;
  title: string;
};

/**
 * Quiet placeholder for a window whose list has nothing to show: what is
 * missing, optionally why or what brings entries back, and one way out.
 */
export const EmptyState: FC<EmptyStateProps> = ({
  action,
  className,
  description,
  title,
}) => {
  return (
    <div
      aria-live="polite"
      className={cn(
        "ll:flex ll:h-full ll:min-h-16 ll:w-full ll:flex-col ll:items-center ll:justify-center ll:gap-0.5 ll:px-4 ll:py-3 ll:text-center",
        className,
      )}
      role="status"
    >
      <p className="ll:m-0 ll:text-xs ll:font-semibold ll:leading-4 ll:text-foreground/85 ll:text-balance">
        {title}
      </p>
      {description ? (
        <p className="ll:m-0 ll:max-w-60 ll:text-[11px] ll:leading-4 ll:text-muted-foreground ll:text-pretty">
          {description}
        </p>
      ) : null}
      {action ? (
        <Button
          className="ll:mt-2"
          onClick={action.onClick}
          size="xs"
          type="button"
          variant="outline"
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  );
};
