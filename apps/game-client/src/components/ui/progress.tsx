import { Progress as BaseProgress } from "@base-ui/react/progress";
import { cn } from "@/lib/utils";

interface ProgressProps extends BaseProgress.Root.Props {
  animationDurationMs?: number;
  disableDefaultTransition?: boolean;
  indicatorColor?: string;
}

function Progress({
  className,
  value,
  indicatorColor,
  animationDurationMs,
  disableDefaultTransition,
  ...props
}: ProgressProps) {
  return (
    <BaseProgress.Root
      data-slot="progress"
      className={cn(
        "ll:bg-gray-500/20 ll:relative ll:h-1 ll:w-full ll:overflow-hidden",
        className,
      )}
      value={value}
      {...props}
    >
      <BaseProgress.Indicator
        data-slot="progress-indicator"
        className={cn(
          "ll:bg-[#5ecbff] ll:h-full ll:w-full ll:flex-1",
          !disableDefaultTransition && "ll:transition-all",
        )}
        style={{
          transform: `translateX(-${100 - (value ?? 0)}%)`,
          background: indicatorColor,
          transition: animationDurationMs
            ? `transform linear ${animationDurationMs}ms`
            : undefined,
        }}
      />
    </BaseProgress.Root>
  );
}

export { Progress };
