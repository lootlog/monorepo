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
    className="ll:min-w-0 ll:max-w-40 ll:text-muted-foreground ll:data-pressed:border-separator ll:data-pressed:text-foreground"
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
