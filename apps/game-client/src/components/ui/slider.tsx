import { Slider as BaseSlider } from "@base-ui/react/slider";
import * as React from "react";
import { cn } from "@/lib/utils";
import { addMeasuredEventListener } from "@/lib/performance-monitoring/measured-callback";

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
    const pointerGesture = React.useRef<{
      originX: number;
      originY: number;
      pointerId: number;
      startedOnThumb: boolean;
    } | null>(null);

    React.useEffect(() => {
      if (Array.isArray(value)) setInternalValue(value[0] ?? 0);
    }, [value]);

    React.useEffect(() => {
      const handlePointerMove = (event: PointerEvent) => {
        const gesture = pointerGesture.current;
        if (
          !gesture ||
          event.pointerId !== gesture.pointerId ||
          gesture.startedOnThumb ||
          (event.clientX === gesture.originX &&
            event.clientY === gesture.originY)
        ) {
          return;
        }

        setDragging(true);
      };
      const endDragging = (event: PointerEvent) => {
        if (
          pointerGesture.current &&
          event.pointerId !== pointerGesture.current.pointerId
        ) {
          return;
        }
        pointerGesture.current = null;
        setDragging(false);
      };
      const removeListeners = [
        addMeasuredEventListener(
          window,
          "pointermove",
          handlePointerMove as EventListener,
          "slider.pointermove",
        ),
        addMeasuredEventListener(
          window,
          "pointerup",
          endDragging as EventListener,
          "slider.pointerup",
        ),
        addMeasuredEventListener(
          window,
          "pointercancel",
          endDragging as EventListener,
          "slider.pointercancel",
        ),
      ];
      return () => {
        for (const removeListener of removeListeners) removeListener();
      };
    }, []);

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
          {...props}
          ref={ref}
          value={value === undefined ? undefined : (value[0] ?? 0)}
          defaultValue={defaultValue?.[0]}
          onValueChange={handleValueChange}
          onValueCommitted={(nextValue) => onValueCommit?.([nextValue])}
          className={cn("ll:group/slider", className)}
          data-slot="slider"
          data-interaction={dragging ? "direct" : "snap"}
        >
          <BaseSlider.Control
            className="ll:relative ll:flex ll:w-full ll:touch-none ll:select-none ll:items-center"
            onPointerDown={(event) => {
              const eventTarget =
                event.target instanceof Element ? event.target : null;
              const startedOnThumb = Boolean(
                eventTarget?.closest('[data-slot="slider-thumb"]'),
              );
              pointerGesture.current = {
                originX: event.clientX,
                originY: event.clientY,
                pointerId: event.pointerId,
                startedOnThumb,
              };
              if (startedOnThumb) {
                setDragging(true);
              }
            }}
          >
            <BaseSlider.Track className="ll:relative ll:box-border ll:h-2 ll:w-full ll:grow ll:overflow-hidden ll:rounded-sm ll:border ll:border-gray-400 ll:bg-gray-700">
              <BaseSlider.Indicator className="ll:absolute ll:h-full ll:bg-purple-500/80 ll:transition-[width] ll:duration-[120ms] ll:ease-[cubic-bezier(0.4,0,0.2,1)] ll:group-data-[interaction=direct]/slider:transition-none ll:motion-reduce:transition-none" />
            </BaseSlider.Track>
            <BaseSlider.Thumb
              aria-label={ariaLabel}
              data-slot="slider-thumb"
              className={cn(
                "ll:relative ll:flex ll:h-3.5 ll:w-2.5 ll:items-center ll:justify-center ll:rounded-sm ll:border ll:border-purple-300 ll:bg-white ll:shadow-[0_0_8px_rgba(168,85,247,0.4)] ll:transition-[left,translate,scale] ll:duration-[120ms] ll:ease-[cubic-bezier(0.4,0,0.2,1)] ll:hover:scale-110 ll:has-[:focus-visible]:outline-none ll:has-[:focus-visible]:ring-1 ll:has-[:focus-visible]:ring-purple-400 ll:has-[:focus-visible]:ring-offset-1 ll:has-[:focus-visible]:ring-offset-purple-950 ll:group-data-[interaction=direct]/slider:scale-90 ll:group-data-[interaction=direct]/slider:transition-none ll:motion-reduce:scale-100 ll:motion-reduce:transition-none ll:data-[disabled]:pointer-events-none ll:data-[disabled]:opacity-50 ll-custom-cursor-pointer",
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
