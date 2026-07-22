import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { getLootlogPortalContainer } from "./theme-boundary";

const SelectValue = BaseSelect.Value;

type SelectProps<Value extends string> = Omit<
  BaseSelect.Root.Props<Value>,
  "onValueChange"
> & {
  onValueChange?: (value: Value) => void;
};

function Select<Value extends string>({
  children,
  items,
  onValueChange,
  ...props
}: SelectProps<Value>) {
  const inferredItems = getSelectItems<Value>(children);

  return (
    <BaseSelect.Root<Value>
      {...props}
      items={items ?? inferredItems}
      onValueChange={(nextValue) => {
        if (nextValue !== null) onValueChange?.(nextValue);
      }}
    >
      {children}
    </BaseSelect.Root>
  );
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  BaseSelect.Trigger.Props
>(({ className, children, ...props }, ref) => (
  <BaseSelect.Trigger
    ref={ref}
    className={cn(
      "ll:flex ll:h-6 ll:w-full ll:min-w-0 ll:items-center ll:justify-between ll:gap-1 ll:rounded-sm ll:border ll:border-solid ll:border-gray-400 ll:bg-transparent ll:px-1.5 ll:text-xs ll:text-white ll:box-border ll:outline-none ll:data-[disabled]:cursor-not-allowed ll:data-[disabled]:opacity-50 ll:focus-visible:border-ring ll:focus-visible:ring-ring/50 ll:focus-visible:ring-[3px] ll:[&>span]:min-w-0 ll:[&>span]:truncate ll:[&>span]:text-left ll:[&>span[data-placeholder]]:text-gray-400 ll-custom-cursor-pointer",
      className,
    )}
    {...props}
  >
    {children}
    <BaseSelect.Icon
      render=<ChevronDown className="ll:h-4 ll:w-4 ll:shrink-0 ll:opacity-50" />
    />
  </BaseSelect.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

const SelectScrollUpButton = (props: BaseSelect.ScrollUpArrow.Props) => (
  <BaseSelect.ScrollUpArrow
    className="ll:flex ll:cursor-default ll:items-center ll:justify-center ll:py-1 ll:text-white"
    {...props}
  >
    <ChevronUp className="ll:h-4 ll:w-4" />
  </BaseSelect.ScrollUpArrow>
);

const SelectScrollDownButton = (props: BaseSelect.ScrollDownArrow.Props) => (
  <BaseSelect.ScrollDownArrow
    className="ll:flex ll:cursor-default ll:items-center ll:justify-center ll:py-1 ll:text-white"
    {...props}
  >
    <ChevronDown className="ll:h-4 ll:w-4" />
  </BaseSelect.ScrollDownArrow>
);

type SelectContentProps = BaseSelect.Popup.Props &
  Pick<
    BaseSelect.Positioner.Props,
    | "align"
    | "alignOffset"
    | "collisionAvoidance"
    | "collisionBoundary"
    | "collisionPadding"
    | "side"
    | "sideOffset"
  > & {
    position?: "item-aligned" | "popper";
  };

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  (
    {
      align,
      alignOffset,
      children,
      className,
      collisionAvoidance,
      collisionBoundary,
      collisionPadding = 8,
      position = "popper",
      side,
      sideOffset,
      ...props
    },
    ref,
  ) => (
    <BaseSelect.Portal container={getLootlogPortalContainer()}>
      <BaseSelect.Positioner
        align={align}
        alignItemWithTrigger={position === "item-aligned"}
        alignOffset={alignOffset}
        collisionAvoidance={collisionAvoidance}
        collisionBoundary={collisionBoundary}
        collisionPadding={collisionPadding}
        side={side}
        sideOffset={sideOffset}
        className="ll:min-w-[var(--anchor-width)]"
      >
        <BaseSelect.Popup
          ref={ref}
          className={cn(
            "ll:z-[500] ll:max-h-[var(--available-height)] ll:min-w-[8rem] ll:overflow-y-auto ll:overflow-x-hidden ll:rounded-sm ll:border ll:border-solid ll:border-gray-400 ll:bg-black/90 ll:text-white ll:box-border ll:shadow-md ll:origin-[var(--transform-origin)] ll:animate-in ll:fade-in-0 ll:zoom-in-95 data-[ending-style]:ll:animate-out data-[ending-style]:ll:fade-out-0 data-[ending-style]:ll:zoom-out-95 data-[side=bottom]:ll:slide-in-from-top-2 data-[side=left]:ll:slide-in-from-right-2 data-[side=right]:ll:slide-in-from-left-2 data-[side=top]:ll:slide-in-from-bottom-2",
            position === "popper" &&
              "data-[side=bottom]:ll:translate-y-1 data-[side=left]:ll:-translate-x-1 data-[side=right]:ll:translate-x-1 data-[side=top]:ll:-translate-y-1 ll:min-w-[var(--anchor-width)]",
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <BaseSelect.List className="ll:flex ll:w-full ll:min-w-[var(--anchor-width)] ll:flex-col ll:gap-1 ll:box-border ll:p-1">
            {children}
          </BaseSelect.List>
          <SelectScrollDownButton />
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  ),
);
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<HTMLElement, BaseSelect.Item.Props>(
  ({ className, children, ...props }, ref) => (
    <BaseSelect.Item
      ref={ref}
      className={cn(
        "ll:relative ll:flex ll:h-6 ll:w-full ll:select-none ll:items-center ll:rounded-sm ll:border ll:border-solid ll:border-gray-400 ll:bg-transparent ll:py-1 ll:pl-2 ll:pr-7 ll:text-[11px] ll:text-white ll:box-border ll:outline-none ll:transition-colors ll:hover:bg-gray-400/30 ll:data-[selected]:bg-gray-400/30 ll:data-[highlighted]:bg-gray-400/30 ll-custom-cursor-pointer data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="ll:absolute ll:right-2 ll:flex ll:h-3.5 ll:w-3.5 ll:items-center ll:justify-center">
        <BaseSelect.ItemIndicator>
          <Check className="ll:h-4 ll:w-4" />
        </BaseSelect.ItemIndicator>
      </span>
      <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
    </BaseSelect.Item>
  ),
);
SelectItem.displayName = "SelectItem";

function getSelectItems<Value extends string>(children: React.ReactNode) {
  const items: Array<{ label: React.ReactNode; value: Value }> = [];

  const visit = (node: React.ReactNode) => {
    React.Children.forEach(node, (child) => {
      if (
        !React.isValidElement<{ children?: React.ReactNode; value?: Value }>(
          child,
        )
      ) {
        return;
      }

      if (child.type === SelectItem && child.props.value !== undefined) {
        items.push({ label: child.props.children, value: child.props.value });
        return;
      }

      visit(child.props.children);
    });
  };

  visit(children);
  return items;
}

export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem };
