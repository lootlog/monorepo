import { SettingsColorSwatch } from "./settings-color-swatch";
import { SettingsListRow } from "./settings-list-row";
import { cn } from "cn";
import type { FC, ReactNode } from "react";

type SettingsColorRowProps = {
  name: ReactNode;
  borderColor: string;
  backgroundColor: string;
  /** Marks a default colour that differs from its factory value. */
  modified?: boolean;
  modifiedLabel?: string;
  /** Accessible name for the edit trigger; omit for a read-only row. */
  editLabel?: string;
  /** Opens the editor; the trigger wraps the swatch and name. */
  editTrigger?: (trigger: ReactNode) => ReactNode;
  /** Trailing actions menu / buttons. */
  children?: ReactNode;
  className?: string;
};

/**
 * One colour in a palette list: swatch + name act as the edit trigger, the
 * trailing slot holds the actions menu. Shared by NPC and timer colours.
 */
export const SettingsColorRow: FC<SettingsColorRowProps> = ({
  name,
  borderColor,
  backgroundColor,
  modified = false,
  modifiedLabel,
  editLabel,
  editTrigger,
  children,
  className,
}) => {
  const content = (
    <>
      <SettingsColorSwatch
        borderColor={borderColor}
        backgroundColor={backgroundColor}
      />
      <span className="ll:min-w-0 ll:flex-1 ll:truncate">{name}</span>
      {modified ? (
        <span
          className="ll:size-1.5 ll:shrink-0 ll:rounded-full ll:bg-primary"
          title={modifiedLabel}
        />
      ) : null}
    </>
  );

  const title = editTrigger ? (
    editTrigger(
      <button
        type="button"
        aria-label={editLabel}
        className="ll-custom-cursor-pointer ll:flex ll:w-full ll:min-w-0 ll:items-center ll:gap-2 ll:rounded-sm ll:border-0 ll:bg-transparent ll:px-0 ll:py-1 ll:text-left ll:text-xs ll:text-foreground ll:outline-none ll:focus-visible:ring-1 ll:focus-visible:ring-ring"
      >
        {content}
      </button>,
    )
  ) : (
    <span className="ll:flex ll:w-full ll:min-w-0 ll:items-center ll:gap-2 ll:py-1 ll:text-xs ll:text-foreground">
      {content}
    </span>
  );

  return (
    <SettingsListRow className={cn("ll:py-0.5", className)} title={title}>
      {children}
    </SettingsListRow>
  );
};
