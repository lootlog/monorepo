import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { Toggle, toggleVariants } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: "default",
  variant: "default",
});

type ToggleGroupVariants = VariantProps<typeof toggleVariants>;

type SingleToggleGroupProps<Value extends string> = Omit<
  BaseToggleGroup.Props<Value>,
  "defaultValue" | "multiple" | "onValueChange" | "value"
> &
  ToggleGroupVariants & {
    defaultValue?: Value;
    onValueChange?: (value: Value) => void;
    type: "single";
    value?: Value;
  };

type MultipleToggleGroupProps<Value extends string> = Omit<
  BaseToggleGroup.Props<Value>,
  "defaultValue" | "multiple" | "onValueChange" | "value"
> &
  ToggleGroupVariants & {
    defaultValue?: Value[];
    onValueChange?: (value: Value[]) => void;
    type: "multiple";
    value?: Value[];
  };

type ToggleGroupProps<Value extends string> =
  | SingleToggleGroupProps<Value>
  | MultipleToggleGroupProps<Value>;

function ToggleGroup<Value extends string>(props: ToggleGroupProps<Value>) {
  const { className, size, variant, children } = props;
  const commonProps = {
    className: cn(
      "ll:group/toggle-group ll:flex ll:w-fit ll:items-center ll:rounded-md ll:data-[variant=outline]:shadow-xs",
      className,
    ),
    "data-size": size,
    "data-variant": variant,
  };
  const content = (
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  );

  if (props.type === "multiple") {
    const {
      children: _children,
      className: _className,
      size: _size,
      type: _type,
      variant: _variant,
      ...multipleProps
    } = props;

    return (
      <BaseToggleGroup {...commonProps} {...multipleProps} multiple>
        {content}
      </BaseToggleGroup>
    );
  }

  const {
    children: _children,
    className: _className,
    defaultValue,
    onValueChange,
    size: _size,
    type: _type,
    value,
    variant: _variant,
    ...singleProps
  } = props;

  return (
    <BaseToggleGroup
      {...commonProps}
      {...singleProps}
      defaultValue={defaultValue === undefined ? undefined : [defaultValue]}
      value={value === undefined ? undefined : value ? [value] : []}
      onValueChange={(nextValue) => onValueChange?.(nextValue[0] ?? "")}
    >
      {content}
    </BaseToggleGroup>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: BaseToggleGroupItemProps) {
  const context = React.useContext(ToggleGroupContext);
  const resolvedVariant = context.variant ?? variant;
  const resolvedSize = context.size ?? size;

  return (
    <Toggle
      data-slot="toggle-group-item"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      className={cn(
        toggleVariants({ variant: resolvedVariant, size: resolvedSize }),
        "ll:min-w-0 ll:flex-1 ll:shrink-0 ll:rounded-none ll:shadow-none ll:first:rounded-l-md ll:last:rounded-r-md ll:focus:z-10 ll:focus-visible:z-10 ll:data-[variant=outline]:border-l-0 ll:data-[variant=outline]:first:border-l",
        className,
      )}
      {...props}
    >
      {children}
    </Toggle>
  );
}

type BaseToggleGroupItemProps = React.ComponentProps<typeof Toggle> &
  ToggleGroupVariants;

export { ToggleGroup, ToggleGroupItem };
