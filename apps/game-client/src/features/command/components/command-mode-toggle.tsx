import type { FC } from "react";
import { Kbd } from "@/components/ui/kbd";
import { Toggle } from "@/components/ui/toggle";

type CommandModeToggleProps = {
  disabled?: boolean;
  label: string;
  onToggle: () => void;
  pressed: boolean;
  /** The typed prefix this button stands for, shown so players learn it. */
  prefix: string;
};

/** Switches what Enter does by rewriting the typed prefix. */
export const CommandModeToggle: FC<CommandModeToggleProps> = ({
  disabled,
  label,
  onToggle,
  pressed,
  prefix,
}) => (
  <Toggle
    size="sm"
    pressed={pressed}
    disabled={disabled}
    onPressedChange={onToggle}
    className="ll:gap-1.5 ll:text-muted-foreground ll:data-pressed:text-white"
  >
    <Kbd aria-hidden className="ll:h-4 ll:min-w-4 ll:text-[10px]">
      {prefix}
    </Kbd>
    {label}
  </Toggle>
);
