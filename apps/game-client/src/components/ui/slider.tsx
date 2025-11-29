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
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState<number[]>(
      (value as number[]) || (defaultValue as number[]) || [0],
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
            className,
          )}
          {...props}
        >
          <SliderPrimitive.Track className="ll:relative ll:h-1.5 ll:w-full ll:grow ll:overflow-hidden ll:rounded-full ll:bg-purple-950/40 ll:border ll:border-purple-900/50">
            <SliderPrimitive.Range className="ll:absolute ll:h-full ll:bg-purple-500" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            onPointerDown={thumbPointerDown}
            className="ll:relative ll:flex ll:items-center ll:justify-center ll:h-3.5 ll:w-2.5 ll:rounded-full ll:border ll:border-purple-300 ll:bg-purple-100 ll:shadow-[0_0_8px_rgba(168,85,247,0.4)] ll:transition-transform ll:hover:scale-110 ll:focus-visible:outline-none ll:focus-visible:ring-1 ll:focus-visible:ring-purple-400 ll:focus-visible:ring-offset-1 ll:focus-visible:ring-offset-purple-950 ll:disabled:pointer-events-none ll:disabled:opacity-50 ll-custom-cursor-pointer"
          >
            {showValue && dragging && (
              <span className="ll:absolute ll:-top-5 ll:left-1/2 ll:-translate-x-1/2 ll:select-none ll:text-[9px] ll:font-medium ll:leading-none ll:rounded ll:bg-purple-600 ll:px-1 ll:py-0.5 ll:text-white ll:shadow-sm ll:pointer-events-none">
                {display}
              </span>
            )}
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Root>
        {showEndpoints && (
          <span className="ll:mt-1 ll:flex ll:justify-between ll:text-[9px] ll:font-medium ll:text-purple-300/70">
            <span>{renderEndpoint(min, "min")}</span>
            <span>{renderEndpoint(max, "max")}</span>
          </span>
        )}
      </div>
    );
  },
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
