import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { toggleVariants } from "@/components/ui/toggle";
import { cn } from "cn";

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants> & {
    spacing?: number;
    orientation?: "horizontal" | "vertical";
  }
>({
  size: "default",
  variant: "default",
  spacing: 2,
  orientation: "horizontal",
});

function ToggleGroup<Value extends string>({
  className,
  variant,
  size,
  spacing = 2,
  orientation = "horizontal",
  children,
  ...props
}: BaseToggleGroup.Props<Value> &
  VariantProps<typeof toggleVariants> & {
    spacing?: number;
    orientation?: "horizontal" | "vertical";
  }) {
  return (
    <BaseToggleGroup
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      // SAFETY: React.CSSProperties has no index signature for custom properties; "--gap" is a valid CSS custom property name consumed by the gap utility below.
      style={{ "--gap": spacing } as React.CSSProperties}
      className={cn(
        "ll:group/toggle-group ll:flex ll:w-fit ll:flex-row ll:items-center ll:gap-[--spacing(var(--gap))] ll:rounded-lg ll:data-[size=sm]:rounded-[min(var(--radius-md),10px)] ll:data-vertical:flex-col ll:data-vertical:items-stretch",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider
        // Vite React Compiler caches this object by its fields (vite.shared.ts enables compiler: true).
        // oxlint-disable-next-line react-doctor/jsx-no-constructed-context-values
        value={{ variant, size, spacing, orientation }}
      >
        {children}
      </ToggleGroupContext.Provider>
    </BaseToggleGroup>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  ...props
}: BaseToggle.Props & VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext);

  return (
    <BaseToggle
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      className={cn(
        "ll:shrink-0 ll:group-data-[spacing=0]/toggle-group:rounded-none ll:group-data-[spacing=0]/toggle-group:px-2 ll:focus:z-10 ll:focus-visible:z-10 ll:group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pr-1.5 ll:group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:pl-1.5 ll:group-data-horizontal/toggle-group:data-[spacing=0]:first:rounded-l-lg ll:group-data-vertical/toggle-group:data-[spacing=0]:first:rounded-t-lg ll:group-data-horizontal/toggle-group:data-[spacing=0]:last:rounded-r-lg ll:group-data-vertical/toggle-group:data-[spacing=0]:last:rounded-b-lg ll:group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 ll:group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 ll:group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l ll:group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className,
      )}
      {...props}
    >
      {children}
    </BaseToggle>
  );
}

export { ToggleGroup, ToggleGroupItem };
