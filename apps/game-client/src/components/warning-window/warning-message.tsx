import type { FC } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

type WarningMessageProps = {
  icon: LucideIcon;
  heading: string;
  description: string;
  /** Icon colour; the text keeps the window's own foreground tokens. */
  iconClassName?: string;
};

/**
 * The body of every Lootlog notice window: an icon, one line that says what
 * happened, and a quieter line that says what to do next.
 */
export const WarningMessage: FC<WarningMessageProps> = ({
  icon: Icon,
  heading,
  description,
  iconClassName,
}) => (
  <div className="ll:flex ll:gap-2.5 ll:p-3">
    <Icon
      aria-hidden
      className={cn(
        "ll:mt-px ll:size-3.5 ll:shrink-0 ll:text-muted-foreground",
        iconClassName,
      )}
    />
    <div className="ll:flex ll:min-w-0 ll:flex-col ll:gap-1">
      <p className="ll:m-0 ll:text-xs ll:font-semibold ll:leading-4 ll:text-foreground ll:text-pretty">
        {heading}
      </p>
      <p className="ll:m-0 ll:text-xs ll:leading-4 ll:text-muted-foreground ll:text-pretty">
        {description}
      </p>
    </div>
  </div>
);
