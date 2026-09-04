import { Switch as BaseSwitch } from "@base-ui/react/switch";
import * as React from "react";
import { cn } from "cn";

const Switch = React.forwardRef<HTMLElement, BaseSwitch.Root.Props>(
  ({ className, ...props }, ref) => (
    <BaseSwitch.Root
      className={cn(
        "ll:peer ll:inline-flex ll:h-4 ll:w-9 ll:shrink-0 ll-custom-cursor-pointer ll:items-center ll:rounded-sm ll:border ll:border-gray-400 ll:box-border ll:shadow-sm ll:transition-colors ll:focus-visible:outline-none ll:focus-visible:ring-1 ll:focus-visible:ring-ring ll:data-[disabled]:cursor-not-allowed ll:data-[disabled]:opacity-50 ll:data-[checked]:bg-purple-500/80 ll:data-[checked]:border-purple-400 ll:data-[unchecked]:bg-gray-700 ll:px-0.5",
        className,
      )}
      {...props}
      ref={ref}
    >
      <BaseSwitch.Thumb className="ll:pointer-events-none ll:block ll:h-2.5 ll:w-3.5 ll:rounded-sm ll:bg-white ll:shadow-md ll:ring-0 ll:transition-transform ll:data-[checked]:translate-x-4 ll:data-[unchecked]:translate-x-0" />
    </BaseSwitch.Root>
  ),
);
Switch.displayName = "Switch";

export { Switch };
