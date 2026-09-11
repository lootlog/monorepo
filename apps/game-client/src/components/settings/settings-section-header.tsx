import { cn } from "cn";
import type { FC, ReactNode } from "react";

type SettingsSectionHeaderProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** `h4` for a group heading nested inside a section. */
  as?: "h3" | "h4";
  className?: string;
};

/** Title, description and trailing actions of a settings card or group. */
export const SettingsSectionHeader: FC<SettingsSectionHeaderProps> = ({
  title,
  description,
  actions,
  as: Heading = "h3",
  className,
}) => (
  <div
    className={cn(
      "ll:flex ll:items-end ll:justify-between ll:gap-2 ll:px-2",
      className,
    )}
  >
    <div className="ll:min-w-0 ll:flex-1">
      {title ? (
        <Heading className="ll:m-0 ll:text-xs ll:font-semibold ll:leading-4 ll:text-foreground">
          {title}
        </Heading>
      ) : null}
      {description ? (
        <p className="ll:m-0 ll:text-[11px] ll:leading-[14px] ll:text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
    {actions ? <div className="ll:shrink-0">{actions}</div> : null}
  </div>
);
