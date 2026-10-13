import { Grid2X2, List } from "lucide-react";
import type { ViewMode } from "@/hooks/use-view-mode";
import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";

type ViewModeToggleProps = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  listLabel: string;
  gridLabel: string;
  size?: "default" | "lg";
  className?: string;
};

export function ViewModeToggle({
  value,
  onChange,
  listLabel,
  gridLabel,
  size = "lg",
  className,
}: ViewModeToggleProps) {
  return (
    <AnimatedToggleGroup
      value={value}
      onValueChange={onChange}
      label={`${listLabel} / ${gridLabel}`}
      size={size}
      className={className}
      options={[
        { value: "list", label: listLabel, icon: List },
        { value: "grid", label: gridLabel, icon: Grid2X2 },
      ]}
    />
  );
}
