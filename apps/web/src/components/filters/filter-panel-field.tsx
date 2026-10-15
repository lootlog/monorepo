import { useId, type ReactNode } from "react";

type FilterPanelFieldProps = {
  /** Omit for a control that names itself, such as a labelled checkbox. */
  label?: string;
  children: ReactNode;
};

/** One filter in a `FiltersOverlay`, ruled off like a loot filters section. */
export const FilterPanelField = ({
  label,
  children,
}: FilterPanelFieldProps) => {
  const labelId = useId();

  return (
    <div
      role={label ? "group" : undefined}
      aria-labelledby={label ? labelId : undefined}
      className="space-y-2 border-b border-sidebar-border px-4 py-4"
    >
      {label && (
        <div id={labelId} className="text-xs font-medium text-muted-foreground">
          {label}
        </div>
      )}
      {children}
    </div>
  );
};
