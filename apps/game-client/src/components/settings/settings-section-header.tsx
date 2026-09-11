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
 * offset; a 24px action control is centred on that line without growing the
 * header, and a description only adds height below it.
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
      "ll:flex ll:flex-wrap ll:items-start ll:justify-between ll:gap-x-2 ll:gap-y-1 ll:px-2",
      className,
    )}
  >
    <div className="ll:min-w-0 ll:flex-1">
      {title ? (
        <Heading
          className={cn(
            "ll:m-0",
            Heading === "h3"
              ? "ll:text-[10px] ll:font-semibold ll:uppercase ll:leading-4 ll:tracking-wide ll:text-muted-foreground"
              : "ll:text-xs ll:font-semibold ll:leading-4 ll:text-foreground",
          )}
        >
          {title}
        </Heading>
      ) : null}
      {description ? (
        <p className="ll:m-0 ll:mt-1 ll:max-w-[80ch] ll:text-[11px] ll:leading-[15px] ll:text-pretty ll:text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
    {actions ? (
      <div className="ll:-my-1 ll:flex ll:shrink-0 ll:items-center">
        {actions}
      </div>
    ) : null}
  </div>
);
