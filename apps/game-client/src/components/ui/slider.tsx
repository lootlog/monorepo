import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "cn";
import type { FocusEvent, KeyboardEvent } from "react";

/**
 * Base UI focuses a visually hidden range input inside each thumb. The thumb
 * mirrors the input's `:focus-visible` as `data-focus-visible` so its ring
 * needs no `:has()` rule, which the game client stylesheet must avoid. A key
 * press always counts as keyboard focus: Base UI then restores
 * `:focus-visible` on the input without reporting a new focus event.
 */
const markThumbFocusVisible = (
  event: FocusEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  visible: boolean,
) => {
  event.currentTarget.parentElement?.toggleAttribute(
    "data-focus-visible",
    visible,
  );
};

function Slider<Value extends number | readonly number[]>({
  "aria-label": ariaLabel,
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props<Value>) {
  const thumbCount = Array.isArray(value)
    ? value.length
    : Array.isArray(defaultValue)
      ? defaultValue.length
      : 1;

  return (
    <SliderPrimitive.Root
      className={cn(
        "ll:data-horizontal:w-full ll:data-vertical:h-full",
        className,
      )}
      aria-label={thumbCount > 1 ? ariaLabel : undefined}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      {...props}
    >
      <SliderPrimitive.Control className="ll:relative ll:flex ll:w-full ll:touch-none ll:items-center ll:select-none ll:data-disabled:opacity-50 ll:data-vertical:h-full ll:data-vertical:w-auto ll:data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="ll:relative ll:grow ll:overflow-hidden ll:rounded-full ll:bg-muted ll:select-none ll:data-horizontal:h-1.5 ll:data-horizontal:w-full ll:data-vertical:h-full ll:data-vertical:w-1.5"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="ll:bg-primary ll:select-none ll:data-horizontal:h-full ll:data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: thumbCount }, (_, index) => (
          <SliderPrimitive.Thumb
            aria-label={ariaLabel}
            data-slot="slider-thumb"
            key={index}
            onFocus={(event) =>
              markThumbFocusVisible(
                event,
                event.currentTarget.matches(":focus-visible"),
              )
            }
            onKeyDown={(event) => markThumbFocusVisible(event, true)}
            onBlur={(event) => markThumbFocusVisible(event, false)}
            className="ll:relative ll:block ll:size-3 ll:shrink-0 ll:rounded-full ll:border ll:border-ring ll:bg-white ll:ring-ring/50 ll:transition-[color,box-shadow] ll:select-none ll:after:absolute ll:after:-inset-2 ll:hover:ring-3 ll:data-focus-visible:ring-3 ll:data-focus-visible:outline-hidden ll:active:ring-3 ll:disabled:pointer-events-none ll:disabled:opacity-50 ll:motion-reduce:transition-none ll-custom-cursor-pointer"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
