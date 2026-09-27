import { Check } from "lucide-react";
import type { FC, ReactNode } from "react";
import { Toggle } from "@/components/ui/toggle";

type TimersListChipProps = {
  pressed: boolean;
  title?: string;
  onPressedChange: () => void;
  onContextMenu?: () => void;
  children: ReactNode;
};

/** A list toggle; the check mark shows the selection without relying on colour. */
export const TimersListChip: FC<TimersListChipProps> = ({
  pressed,
  title,
  onPressedChange,
  onContextMenu,
  children,
}) => (
  <Toggle
    size="xs"
    variant="outline"
    pressed={pressed}
    title={title}
    className="ll:min-w-0 ll:max-w-40 ll:text-muted-foreground ll:data-pressed:border-gray-400/60 ll:data-pressed:text-white"
    onPressedChange={onPressedChange}
    onContextMenu={
      onContextMenu
        ? (event) => {
            event.preventDefault();
            onContextMenu();
          }
        : undefined
    }
  >
    {pressed && <Check aria-hidden="true" />}
    {children}
  </Toggle>
);
