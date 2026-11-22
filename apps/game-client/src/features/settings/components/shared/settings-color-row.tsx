import { ColorSwatch } from "@/components/ui/color-swatch";
import { SettingsListRow } from "./settings-list-row";
import type { FC, ReactNode } from "react";

type SettingsColorRowProps = {
  name: ReactNode;
  meta?: ReactNode;
  borderColor: string;
  backgroundColor: string;
  modified?: boolean;
  modifiedLabel?: string;
  editLabel?: string;
  editTrigger?: (trigger: ReactNode) => ReactNode;
  preview?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export const SettingsColorRow: FC<SettingsColorRowProps> = ({
  name,
  meta,
  borderColor,
  backgroundColor,
  modified = false,
  modifiedLabel,
  editLabel,
  editTrigger,
  preview,
  children,
  className,
}) => {
  const content = (
    <>
      <ColorSwatch color={borderColor} fill={backgroundColor} />
      <span className="ll:min-w-0 ll:flex-1 ll:truncate">
        {name}
        {meta ? (
          <span className="ll:ml-2 ll:font-mono ll:text-[11px] ll:uppercase ll:tracking-wide ll:text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </span>
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
        className="ll-custom-cursor-pointer ll:flex ll:w-full ll:min-w-0 ll:items-center ll:gap-2.5 ll:rounded-sm ll:border-0 ll:bg-transparent ll:px-0 ll:py-0 ll:text-left ll:text-[13px] ll:font-semibold ll:text-foreground ll:outline-none ll:focus-visible:ring-1 ll:focus-visible:ring-ring"
      >
        {content}
      </button>,
    )
  ) : (
    <span className="ll:flex ll:w-full ll:min-w-0 ll:items-center ll:gap-2.5 ll:py-0 ll:text-[13px] ll:font-semibold ll:text-foreground">
      {content}
    </span>
  );

  return (
    <SettingsListRow className={className} title={title}>
      {preview ? (
        <span className="ll:mr-1 ll:flex ll:shrink-0 ll:items-center">
          {preview}
        </span>
      ) : null}
      {children}
    </SettingsListRow>
  );
};
