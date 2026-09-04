import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { Toggle, toggleVariants } from "@/components/ui/toggle";
import { cn } from "cn";

type ToggleGroupContextValue = VariantProps<typeof toggleVariants> & {
  type: "multiple" | "single";
};

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
  size: "default",
  type: "single",
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

const setRefValue = <Value,>(
  ref: React.Ref<Value> | undefined,
  value: Value | null,
) => {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
};

const updateToggleGroupIndicator = (root: HTMLElement) => {
  const activeItem = root.querySelector<HTMLElement>(
    '[data-slot="toggle-group-item"][data-pressed]',
  );
  if (!activeItem || activeItem.offsetWidth === 0) {
    root.removeAttribute("data-indicator-visible");
    return;
  }

  root.style.setProperty("--toggle-indicator-x", `${activeItem.offsetLeft}px`);
  root.style.setProperty(
    "--toggle-indicator-width",
    `${activeItem.offsetWidth}px`,
  );
  root.setAttribute("data-indicator-visible", "");
};

function ToggleGroup<Value extends string>(props: ToggleGroupProps<Value>) {
  const { className, size, variant, children, ref: providedRef } = props;
  const rootRef = React.useRef<HTMLElement | null>(null);
  const setRootRef = (element: HTMLElement | null) => {
    rootRef.current = element;
    setRefValue(providedRef, element);
  };

  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || props.type === "multiple") {
      root?.removeAttribute("data-indicator-visible");
      return;
    }

    let animationFrame: number | undefined;
    const scheduleIndicatorUpdate = () => {
      if (animationFrame !== undefined) {
        cancelAnimationFrame(animationFrame);
      }
      animationFrame = requestAnimationFrame(() => {
        animationFrame = undefined;
        updateToggleGroupIndicator(root);
      });
    };
    const resizeObserver = new ResizeObserver(scheduleIndicatorUpdate);
    const observeItems = () => {
      for (const item of root.querySelectorAll(
        '[data-slot="toggle-group-item"]',
      )) {
        resizeObserver.observe(item);
      }
    };
    const mutationObserver = new MutationObserver(() => {
      observeItems();
      scheduleIndicatorUpdate();
    });

    resizeObserver.observe(root);
    observeItems();
    mutationObserver.observe(root, {
      attributeFilter: ["data-pressed"],
      attributes: true,
      childList: true,
      subtree: true,
    });
    updateToggleGroupIndicator(root);

    return () => {
      if (animationFrame !== undefined) {
        cancelAnimationFrame(animationFrame);
      }
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [props.type]);

  const commonProps = {
    className: cn(
      "ll:group/toggle-group ll:relative ll:flex ll:w-fit ll:items-center ll:rounded-sm ll:border ll:border-gray-400 ll:bg-gray-700 ll:p-0.5 ll:shadow-sm ll:before:pointer-events-none ll:before:absolute ll:before:inset-y-0.5 ll:before:left-0 ll:before:w-[var(--toggle-indicator-width)] ll:before:translate-x-[var(--toggle-indicator-x)] ll:before:rounded-[2px] ll:before:bg-purple-500/80 ll:before:opacity-0 ll:before:shadow-sm ll:before:transition-[width,translate,opacity] ll:before:duration-[120ms] ll:before:ease-[cubic-bezier(0.4,0,0.2,1)] ll:data-[indicator-visible]:before:opacity-100 ll:motion-reduce:before:transition-none",
      className,
    ),
    "data-slot": "toggle-group",
    "data-size": size,
    "data-type": props.type,
    "data-variant": variant,
  };
  const content = (
    <ToggleGroupContext.Provider value={{ variant, size, type: props.type }}>
      {children}
    </ToggleGroupContext.Provider>
  );

  if (props.type === "multiple") {
    const {
      children: _children,
      className: _className,
      ref: _ref,
      size: _size,
      type: _type,
      variant: _variant,
      ...multipleProps
    } = props;

    return (
      <BaseToggleGroup
        {...commonProps}
        {...multipleProps}
        ref={setRootRef}
        multiple
      >
        {content}
      </BaseToggleGroup>
    );
  }

  const {
    children: _children,
    className: _className,
    defaultValue,
    onValueChange,
    ref: _ref,
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
      ref={setRootRef}
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
        "ll:relative ll:z-10 ll:min-w-0 ll:flex-1 ll:shrink-0 ll:rounded-[2px] ll:bg-transparent ll:text-gray-300 ll:shadow-none ll:hover:bg-gray-600 ll:hover:text-white ll:focus:z-20 ll:focus-visible:z-20 ll:focus-visible:ring-purple-300 ll:data-[pressed]:text-white",
        context.type === "single"
          ? "ll:data-[pressed]:bg-transparent"
          : "ll:data-[pressed]:bg-purple-500/80",
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
