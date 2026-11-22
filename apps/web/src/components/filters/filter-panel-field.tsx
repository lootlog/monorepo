import { useId, type ReactNode } from "react";

type FilterPanelFieldProps = {
  label?: string;
  children: ReactNode;
};

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
