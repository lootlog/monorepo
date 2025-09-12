import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  showValue?: boolean;
  formatValue?: (value: number) => React.ReactNode;
  showEndpoints?: boolean; // show min & max labels
  formatEndpoint?: (value: number, type: "min" | "max") => React.ReactNode;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(
  (
    {
      className,
      value,
      defaultValue,
      onValueChange,
      showValue = true,
      formatValue,
      showEndpoints = true,
      formatEndpoint,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState<number[]>(
      (value as number[]) || (defaultValue as number[]) || [0]
    );

    React.useEffect(() => {
      if (Array.isArray(value)) setInternalValue(value);
    }, [value]);

    const handleValueChange = (vals: number[]) => {
      if (value === undefined) setInternalValue(vals); // uncontrolled
      onValueChange?.(vals);
    };

    const currentVal = (Array.isArray(value) ? value : internalValue)[0];
    const display = formatValue ? formatValue(currentVal) : currentVal;

    const [dragging, setDragging] = React.useState(false);
    const thumbPointerDown = () => setDragging(true);
    React.useEffect(() => {
      if (!dragging) return;
      const end = () => setDragging(false);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      return () => {
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
      };
    }, [dragging]);

    const min = props.min ?? 0;
    const max = props.max ?? 100;

    const renderEndpoint = (val: number, type: "min" | "max") =>
      formatEndpoint ? formatEndpoint(val, type) : val;

    return (
      <div className="ll:w-full">
        <SliderPrimitive.Root
          ref={ref}
          value={value as number[] | undefined}
          defaultValue={defaultValue as number[] | undefined}
          onValueChange={handleValueChange}
          className={cn(
            "ll:relative ll:flex ll:w-full ll:touch-none ll:select-none ll:items-center",
            className
          )}
          {...props}
        >
          <SliderPrimitive.Track className="ll:relative ll:h-1.5 ll:w-full ll:grow ll:overflow-hidden ll:rounded-full ll:bg-primary/40">
            <SliderPrimitive.Range className="ll:absolute ll:h-full ll:bg-primary" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            onPointerDown={thumbPointerDown}
            className="ll:relative ll:flex ll:items-center ll:justify-center ll:h-4 ll:w-4 ll:rounded-full ll:border ll:border-primary/50 ll:bg-ring ll:shadow ll:transition-colors focus-visible:ll:outline-none focus-visible:ll:ring-1 focus-visible:ll:ring-ring disabled:ll:pointer-events-none disabled:ll:opacity-50"
          >
            {showValue && dragging && (
              <span className="ll:absolute -ll:top-5 ll:left-1/2 -ll:translate-x-1/2 ll:select-none ll:text-[10px] ll:leading-none ll:rounded ll:bg-black/70 ll:px-1 ll:py-[1px] ll:text-white ll:pointer-events-none">
                {display}
              </span>
            )}
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Root>
        {showEndpoints && (
          <span className="ll:mb-1 ll:flex ll:justify-between ll:text-[10px] ll:text-muted-foreground">
            <span>{renderEndpoint(min, "min")}</span>
            <span>{renderEndpoint(max, "max")}</span>
          </span>
        )}
      </div>
    );
  }
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
