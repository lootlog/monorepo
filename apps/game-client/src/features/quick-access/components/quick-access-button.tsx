import type { ComponentProps, FC, ReactNode } from "react";
import { HotkeyCaps } from "@/components/hotkey-caps";
import { IconButton } from "@/components/ui/icon-button";
import type { HotkeyBinding } from "@/store/hotkeys.store";

export type QuickAccessButtonProps = Omit<
  ComponentProps<typeof IconButton>,
  "children" | "tooltip"
> & {
  icon: ReactNode;
  /** Shown as key caps next to the label; hidden when unassigned. */
  binding?: HotkeyBinding;
};

const isAssigned = (
  binding: HotkeyBinding | undefined,
): binding is HotkeyBinding =>
  binding !== undefined && (binding.type === "mouse" || binding.key !== "");

/**
 * One taskbar-style tile of the quick access bar: the shared icon button with
 * the window's hotkey in its tooltip. Extra props (including `ref` and popover
 * trigger props) go straight to the button so it can serve as a
 * `PopoverTrigger` render target.
 */
export const QuickAccessButton: FC<QuickAccessButtonProps> = ({
  label,
  icon,
  binding,
  ...buttonProps
}) => (
  <IconButton
    variant="taskbar"
    label={label}
    tooltip={
      <div className="ll:flex ll:items-center ll:gap-2">
        <span>{label}</span>
        {isAssigned(binding) ? <HotkeyCaps binding={binding} /> : null}
      </div>
    }
    {...buttonProps}
  >
    {icon}
  </IconButton>
);
