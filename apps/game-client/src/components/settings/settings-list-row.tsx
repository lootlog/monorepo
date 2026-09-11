import { cn } from "cn";
import type { FC, ReactNode } from "react";

type SettingsListRowProps = {
  /** Avatar, icon or swatch shown before the text. */
  leading?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Trailing controls: buttons, badges, popover triggers. */
  children?: ReactNode;
  className?: string;
};

/**
 * One entry of a list inside settings (a server, a muted player, a hidden
 * timer, a colour). Same rhythm as SettingsRow, but the text is an item name
 * rather than a setting label, and the trailing slot holds item actions.
 */
export const SettingsListRow: FC<SettingsListRowProps> = ({
  leading,
  title,
  description,
  children,
  className,
}) => (
  <div
    className={cn(
      "ll:flex ll:min-h-7 ll:items-center ll:gap-2 ll:rounded-sm ll:px-2 ll:py-1 ll:transition-colors ll:hover:bg-white/5",
      className,
    )}
  >
    {leading ? (
      <span className="ll:flex ll:shrink-0 ll:items-center">{leading}</span>
    ) : null}
    <div className="ll:min-w-0 ll:flex-1">
      <div className="ll:truncate ll:text-xs ll:leading-4 ll:text-gray-100">
        {title}
      </div>
      {description ? (
        <p className="ll:m-0 ll:truncate ll:text-[11px] ll:leading-[14px] ll:text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
    {children ? (
      <div className="ll:flex ll:shrink-0 ll:items-center ll:gap-1">
        {children}
      </div>
    ) : null}
  </div>
);
