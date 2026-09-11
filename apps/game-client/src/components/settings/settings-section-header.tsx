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

/**
 * Title and trailing actions of a settings section (a small caps label) or of
 * a group nested inside it (a regular heading with an optional description).
 *
 * The title always sits on the first line so every tab starts at the same
 * offset. Actions are centred against the whole text block (title plus
 * description) so they read the same in every section.
 */
export const SettingsSectionHeader: FC<SettingsSectionHeaderProps> = ({
  title,
  description,
  actions,
  as: Heading = "h3",
  className,
}) => (
  <div
    className={cn(
      "ll:flex ll:flex-wrap ll:items-center ll:justify-between ll:gap-x-6 ll:gap-y-1 ll:px-2",
      className,
    )}
  >
    <div className="ll:min-w-0 ll:flex-1">
      {title ? (
        <Heading
          className={cn(
            "ll:m-0",
            Heading === "h3"
              ? "ll:text-[11px] ll:font-semibold ll:uppercase ll:leading-4 ll:tracking-wide ll:text-muted-foreground"
              : "ll:text-[13px] ll:font-semibold ll:leading-[18px] ll:text-foreground",
          )}
        >
          {title}
        </Heading>
      ) : null}
      {description ? (
        <p className="ll:m-0 ll:mt-1 ll:max-w-[80ch] ll:text-xs ll:leading-[17px] ll:text-pretty ll:text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
    {actions ? (
      <div className="ll:flex ll:shrink-0 ll:items-center">{actions}</div>
    ) : null}
  </div>
);
