import { Slider as BaseSlider } from "@base-ui/react/slider";
import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps extends Omit<
  BaseSlider.Root.Props<number>,
  "defaultValue" | "onValueChange" | "onValueCommitted" | "value"
> {
  defaultValue?: number[];
  formatEndpoint?: (value: number, type: "min" | "max") => React.ReactNode;
  formatValue?: (value: number) => React.ReactNode;
  onValueChange?: (
    value: number[],
    eventDetails: BaseSlider.Root.ChangeEventDetails,
  ) => void;
  onValueCommit?: (value: number[]) => void;
  showEndpoints?: boolean;
  showValue?: boolean;
  value?: number[];
}

function getInitialSliderValue(
  value: SliderProps["value"],
  defaultValue: SliderProps["defaultValue"],
) {
  if (Array.isArray(value)) return value[0] ?? 0;
  if (Array.isArray(defaultValue)) return defaultValue[0] ?? 0;
  return 0;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      "aria-label": ariaLabel,
      className,
      value,
      defaultValue,
      onValueChange,
      onValueCommit,
      showValue = true,
      formatValue,
      showEndpoints = true,
      formatEndpoint,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState<number>(() =>
      getInitialSliderValue(value, defaultValue),
    );
    const [dragging, setDragging] = React.useState(false);

    React.useEffect(() => {
      if (Array.isArray(value)) setInternalValue(value[0] ?? 0);
    }, [value]);

    React.useEffect(() => {
      if (!dragging) return;

      const endDragging = () => setDragging(false);
      window.addEventListener("pointerup", endDragging);
      window.addEventListener("pointercancel", endDragging);
      return () => {
        window.removeEventListener("pointerup", endDragging);
        window.removeEventListener("pointercancel", endDragging);
      };
    }, [dragging]);

    const handleValueChange = (
      nextValue: number,
      eventDetails: BaseSlider.Root.ChangeEventDetails,
    ) => {
      if (value === undefined) setInternalValue(nextValue);
      onValueChange?.([nextValue], eventDetails);
    };

    const currentValue = Array.isArray(value) ? (value[0] ?? 0) : internalValue;
    const displayValue = formatValue ? formatValue(currentValue) : currentValue;
    const min = props.min ?? 0;
    const max = props.max ?? 100;
    const renderEndpoint = (endpoint: number, type: "min" | "max") =>
      formatEndpoint ? formatEndpoint(endpoint, type) : endpoint;

    return (
      <div className="ll:w-full">
        <BaseSlider.Root
          ref={ref}
          value={value === undefined ? undefined : (value[0] ?? 0)}
          defaultValue={defaultValue?.[0]}
          onValueChange={handleValueChange}
          onValueCommitted={(nextValue) => onValueCommit?.([nextValue])}
          className={className}
          {...props}
        >
          <BaseSlider.Control className="ll:relative ll:flex ll:w-full ll:touch-none ll:select-none ll:items-center">
            <BaseSlider.Track className="ll:relative ll:h-1.5 ll:w-full ll:grow ll:rounded-full ll:bg-purple-950/40 ll:border ll:border-purple-900/50">
              <BaseSlider.Indicator className="ll:absolute ll:h-full ll:bg-purple-500" />
            </BaseSlider.Track>
            <BaseSlider.Thumb
              aria-label={ariaLabel}
              onPointerDown={() => setDragging(true)}
              className={cn(
                "ll:relative ll:flex ll:items-center ll:justify-center ll:h-3.5 ll:w-2.5 ll:rounded-full ll:border ll:border-purple-300 ll:bg-purple-100 ll:shadow-[0_0_8px_rgba(168,85,247,0.4)] ll:transition-transform ll:hover:scale-110 ll:has-[:focus-visible]:outline-none ll:has-[:focus-visible]:ring-1 ll:has-[:focus-visible]:ring-purple-400 ll:has-[:focus-visible]:ring-offset-1 ll:has-[:focus-visible]:ring-offset-purple-950 ll:data-[disabled]:pointer-events-none ll:data-[disabled]:opacity-50 ll-custom-cursor-pointer",
              )}
            >
              {showValue && dragging && (
                <span className="ll:absolute ll:-top-5 ll:left-1/2 ll:-translate-x-1/2 ll:select-none ll:text-[9px] ll:font-medium ll:leading-none ll:rounded ll:bg-purple-600 ll:px-1 ll:py-0.5 ll:text-white ll:shadow-sm ll:pointer-events-none">
                  {displayValue}
                </span>
              )}
            </BaseSlider.Thumb>
          </BaseSlider.Control>
        </BaseSlider.Root>
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
Slider.displayName = "Slider";

export { Slider };
