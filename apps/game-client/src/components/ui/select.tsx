import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";
import { cn } from "cn";
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

type SelectTriggerProps = BaseSelect.Trigger.Props & {
  size?: "sm" | "default";
};

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, size = "default", ...props }, ref) => (
    <BaseSelect.Trigger
      ref={ref}
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "ll:flex ll:w-full ll:min-w-0 ll:items-center ll:justify-between ll:gap-1.5 ll:whitespace-nowrap ll:rounded-sm ll:border ll:border-input ll:bg-input/30 ll:text-xs ll:text-foreground ll:outline-none ll:transition-[color,box-shadow,background-color,border-color] ll:hover:bg-accent ll:hover:text-accent-foreground ll:focus-visible:border-ring ll:focus-visible:ring-[3px] ll:focus-visible:ring-ring/50 ll:data-[popup-open]:border-ring ll:data-[popup-open]:ring-[3px] ll:data-[popup-open]:ring-ring/50 ll:data-[disabled]:cursor-not-allowed ll:data-[disabled]:opacity-50 ll:data-[size=default]:h-7 ll:data-[size=default]:px-2 ll:data-[size=sm]:h-6 ll:data-[size=sm]:px-1.5 ll:data-[size=sm]:text-[11px] ll:[&>span]:min-w-0 ll:[&>span]:flex ll:[&>span]:items-center ll:[&>span]:gap-1.5 ll:[&>span]:truncate ll:[&>span]:text-left ll:[&>span[data-placeholder]]:text-muted-foreground ll:[&_svg]:pointer-events-none ll:[&_svg]:shrink-0 ll:[&_svg:not([class*=text-])]:text-muted-foreground ll-custom-cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
      <BaseSelect.Icon
        render=<ChevronDown className="ll:size-3.5 ll:opacity-70" />
      />
    </BaseSelect.Trigger>
  ),
);

SelectTrigger.displayName = "SelectTrigger";

const SelectScrollUpButton = (props: BaseSelect.ScrollUpArrow.Props) => (
  <BaseSelect.ScrollUpArrow
    className="ll:flex ll:cursor-default ll:items-center ll:justify-center ll:py-1 ll:text-popover-foreground"
    {...props}
  >
    <ChevronUp className="ll:h-4 ll:w-4" />
  </BaseSelect.ScrollUpArrow>
);

const SelectScrollDownButton = (props: BaseSelect.ScrollDownArrow.Props) => (
  <BaseSelect.ScrollDownArrow
    className="ll:flex ll:cursor-default ll:items-center ll:justify-center ll:py-1 ll:text-popover-foreground"
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
        // Draggable windows are positioned siblings with their own z-index;
        // the positioner must sit above every window like the other overlays.
        className="ll:z-[500] ll:min-w-[var(--anchor-width)]"
      >
        <BaseSelect.Popup
          ref={ref}
          className={cn(
            "ll:z-[500] ll:max-h-[var(--available-height)] ll:min-w-[8rem] ll:overflow-y-auto ll:overflow-x-hidden ll:rounded-sm ll:border ll:border-border ll:bg-popover ll:text-popover-foreground ll:shadow-lg ll:origin-[var(--transform-origin)] ll:animate-in ll:fade-in-0 ll:zoom-in-95 data-[ending-style]:ll:animate-out data-[ending-style]:ll:fade-out-0 data-[ending-style]:ll:zoom-out-95 data-[side=bottom]:ll:slide-in-from-top-2 data-[side=left]:ll:slide-in-from-right-2 data-[side=right]:ll:slide-in-from-left-2 data-[side=top]:ll:slide-in-from-bottom-2",
            position === "popper" &&
              "data-[side=bottom]:ll:translate-y-1 data-[side=left]:ll:-translate-x-1 data-[side=right]:ll:translate-x-1 data-[side=top]:ll:-translate-y-1 ll:min-w-[var(--anchor-width)]",
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <BaseSelect.List className="ll:flex ll:w-full ll:min-w-[var(--anchor-width)] ll:flex-col ll:p-1">
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
        "ll:relative ll:flex ll:min-h-6 ll:w-full ll:select-none ll:items-center ll:gap-1.5 ll:rounded-sm ll:py-1 ll:pl-2 ll:pr-7 ll:text-[11px] ll:text-popover-foreground ll:outline-none ll:transition-colors ll:data-[highlighted]:bg-primary/15 ll:data-[highlighted]:text-foreground ll:data-[disabled]:pointer-events-none ll:data-[disabled]:opacity-50 ll:[&_svg]:pointer-events-none ll:[&_svg]:shrink-0 ll:[&_svg:not([class*=text-])]:text-muted-foreground ll-custom-cursor-pointer",
        className,
      )}
      {...props}
    >
      <BaseSelect.ItemText className="ll:flex ll:min-w-0 ll:items-center ll:gap-1.5 ll:truncate">
        {children}
      </BaseSelect.ItemText>
      <BaseSelect.ItemIndicator
        render=<span className="ll:absolute ll:right-2 ll:flex ll:size-3.5 ll:items-center ll:justify-center" />
      >
        <Check className="ll:size-3.5" />
      </BaseSelect.ItemIndicator>
    </BaseSelect.Item>
  ),
);

SelectItem.displayName = "SelectItem";

const SelectGroup = (props: BaseSelect.Group.Props) => (
  <BaseSelect.Group data-slot="select-group" {...props} />
);

const SelectLabel = ({ className, ...props }: BaseSelect.GroupLabel.Props) => (
  <BaseSelect.GroupLabel
    data-slot="select-label"
    className={cn(
      "ll:px-2 ll:py-1.5 ll:text-[11px] ll:text-muted-foreground",
      className,
    )}
    {...props}
  />
);

const SelectSeparator = ({
  className,
  ...props
}: BaseSelect.Separator.Props) => (
  <BaseSelect.Separator
    data-slot="select-separator"
    className={cn(
      "ll:pointer-events-none ll:-mx-1 ll:my-1 ll:h-px ll:bg-border",
      className,
    )}
    {...props}
  />
);

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

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
