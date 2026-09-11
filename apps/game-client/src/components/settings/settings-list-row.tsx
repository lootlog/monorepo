import { cn } from "cn";
import type { CSSProperties, FC, ReactNode } from "react";

type SettingsListRowProps = {
  /** Avatar, icon or swatch shown before the text. */
  leading?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Trailing controls: buttons, badges, popover triggers. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
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
  style,
}) => (
  <div
    style={style}
    className={cn(
      "ll:flex ll:min-h-9 ll:items-center ll:gap-2.5 ll:rounded-sm ll:px-2 ll:py-1.5 ll:transition-colors ll:hover:bg-white/5",
      className,
    )}
  >
    {leading ? (
      <span className="ll:flex ll:shrink-0 ll:items-center">{leading}</span>
    ) : null}
    <div className="ll:min-w-0 ll:flex-1">
      <div className="ll:truncate ll:text-[13px] ll:font-semibold ll:leading-[18px] ll:text-foreground">
        {title}
      </div>
      {description ? (
        <p className="ll:m-0 ll:truncate ll:text-xs ll:leading-4 ll:text-muted-foreground">
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
