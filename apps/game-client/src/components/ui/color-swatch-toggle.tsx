import { cn } from "cn";
import { Check } from "lucide-react";
import type { FC } from "react";
import { ColorSwatch } from "@/components/ui/color-swatch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ColorSwatchToggleProps = {
  color: string;
  /** Colour name: the accessible name and the tooltip. */
  label: string;
  selected: boolean;
  onClick: () => void;
};

/**
 * A pickable colour: a 24×24 px target around the swatch, `aria-pressed`
 * state, and a check mark plus ring on the selected colour so selection does
 * not rely on colour alone.
 */
export const ColorSwatchToggle: FC<ColorSwatchToggleProps> = ({
  color,
  label,
  selected,
  onClick,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label={label}
        aria-pressed={selected}
        onClick={onClick}
        className="ll-custom-cursor-pointer ll:relative ll:flex ll:size-6 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:p-0 ll:transition-colors ll:hover:bg-white/10 ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:motion-reduce:transition-none"
      >
        <ColorSwatch
          color={color}
          className={cn(
            "ll:size-5",
            // An outline, not a ring: the swatch paints its border with an
            // inline box-shadow.
            selected &&
              "ll:outline-1 ll:outline-offset-1 ll:outline-foreground",
          )}
        />
        {selected ? (
          <span
            aria-hidden="true"
            className="ll:absolute ll:flex ll:size-3 ll:items-center ll:justify-center ll:rounded-full ll:bg-black/80 ll:text-white"
          >
            <Check size={10} strokeWidth={3} />
          </span>
        ) : null}
      </button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);
