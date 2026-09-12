import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, Search } from "lucide-react";
import * as React from "react";
import { cn } from "cn";
import {
  selectGroupLabelClassName,
  selectItemClassName,
  selectPopupClassName,
  selectTriggerClassName,
} from "./select";
import { getLootlogPortalContainer } from "./theme-boundary";

/**
 * Searchable select (shadcn Base UI combobox). The trigger, popup and items
 * share the plain select's classes; the only visible difference is the
 * search field at the top of the list.
 */
const Combobox = BaseCombobox.Root;

const ComboboxValue = (props: BaseCombobox.Value.Props) => (
  <BaseCombobox.Value {...props} />
);

type ComboboxTriggerProps = BaseCombobox.Trigger.Props & {
  size?: "sm" | "default";
};

const ComboboxTrigger = React.forwardRef<
  HTMLButtonElement,
  ComboboxTriggerProps
>(({ className, children, size = "default", ...props }, ref) => (
  <BaseCombobox.Trigger
    ref={ref}
    data-slot="combobox-trigger"
    data-size={size}
    className={cn(selectTriggerClassName, className)}
    {...props}
  >
    {children}
    <BaseCombobox.Icon
      render=<ChevronDown className="ll:size-3.5 ll:opacity-70" />
    />
  </BaseCombobox.Trigger>
));

ComboboxTrigger.displayName = "ComboboxTrigger";

type ComboboxContentProps = BaseCombobox.Popup.Props &
  Pick<
    BaseCombobox.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "collisionPadding"
  >;

const ComboboxContent = React.forwardRef<HTMLDivElement, ComboboxContentProps>(
  (
    {
      align = "start",
      alignOffset,
      className,
      collisionPadding = 8,
      side = "bottom",
      sideOffset = 4,
      ...props
    },
    ref,
  ) => (
    <BaseCombobox.Portal container={getLootlogPortalContainer()}>
      <BaseCombobox.Positioner
        align={align}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        side={side}
        sideOffset={sideOffset}
        // Same overlay layer as the select: above every draggable window.
        className="ll:z-[500] ll:min-w-[var(--anchor-width)]"
      >
        <BaseCombobox.Popup
          ref={ref}
          data-slot="combobox-content"
          className={cn(
            selectPopupClassName,
            "ll:group/combobox-content ll:flex ll:w-[var(--anchor-width)] ll:max-w-[var(--available-width)] ll:flex-col ll:overflow-hidden",
            className,
          )}
          {...props}
        />
      </BaseCombobox.Positioner>
    </BaseCombobox.Portal>
  ),
);

ComboboxContent.displayName = "ComboboxContent";

/** Search field pinned to the top of the popup. */
const ComboboxInput = React.forwardRef<
  HTMLInputElement,
  BaseCombobox.Input.Props
>(({ className, ...props }, ref) => (
  <div className="ll:relative ll:shrink-0 ll:border-0 ll:border-b ll:border-solid ll:border-border ll:p-1">
    <Search
      className="ll:pointer-events-none ll:absolute ll:start-2.5 ll:top-1/2 ll:size-3.5 ll:-translate-y-1/2 ll:text-muted-foreground"
      strokeWidth={1.5}
      aria-hidden="true"
    />
    <BaseCombobox.Input
      ref={ref}
      data-slot="combobox-input"
      autoComplete="off"
      spellCheck={false}
      onMouseDown={(event) => event.stopPropagation()}
      className={cn(
        "ll:flex ll:h-6 ll:w-full ll:min-w-0 ll:rounded-sm ll:border ll:border-transparent ll:bg-transparent ll:ps-6 ll:pe-2 ll:text-[11px] ll:text-foreground ll:outline-none ll:placeholder:text-muted-foreground ll:focus-visible:border-ring",
        className,
      )}
      {...props}
    />
  </div>
));

ComboboxInput.displayName = "ComboboxInput";

const ComboboxList = React.forwardRef<HTMLDivElement, BaseCombobox.List.Props>(
  ({ className, ...props }, ref) => (
    <BaseCombobox.List
      ref={ref}
      data-slot="combobox-list"
      className={cn(
        "ll:flex ll:min-h-0 ll:w-full ll:flex-col ll:overflow-y-auto ll:overscroll-contain ll:p-1 ll:data-[empty]:p-0",
        className,
      )}
      {...props}
    />
  ),
);

ComboboxList.displayName = "ComboboxList";

const ComboboxItem = React.forwardRef<HTMLDivElement, BaseCombobox.Item.Props>(
  ({ className, children, ...props }, ref) => (
    <BaseCombobox.Item
      ref={ref}
      data-slot="combobox-item"
      className={cn(selectItemClassName, className)}
      {...props}
    >
      <span className="ll:flex ll:min-w-0 ll:items-center ll:gap-1.5 ll:truncate">
        {children}
      </span>
      <BaseCombobox.ItemIndicator
        render=<span className="ll:absolute ll:right-2 ll:flex ll:size-3.5 ll:items-center ll:justify-center" />
      >
        <Check className="ll:size-3.5" />
      </BaseCombobox.ItemIndicator>
    </BaseCombobox.Item>
  ),
);

ComboboxItem.displayName = "ComboboxItem";

const ComboboxGroup = (props: BaseCombobox.Group.Props) => (
  <BaseCombobox.Group data-slot="combobox-group" {...props} />
);

const ComboboxLabel = ({
  className,
  ...props
}: BaseCombobox.GroupLabel.Props) => (
  <BaseCombobox.GroupLabel
    data-slot="combobox-label"
    className={cn(selectGroupLabelClassName, className)}
    {...props}
  />
);

const ComboboxCollection = (props: BaseCombobox.Collection.Props) => (
  <BaseCombobox.Collection {...props} />
);

const ComboboxEmpty = ({ className, ...props }: BaseCombobox.Empty.Props) => (
  <BaseCombobox.Empty
    data-slot="combobox-empty"
    className={cn(
      // Base UI keeps the element mounted; show it only when nothing matches.
      "ll:hidden ll:px-2 ll:py-2 ll:text-[11px] ll:text-muted-foreground ll:group-data-[empty]/combobox-content:block",
      className,
    )}
    {...props}
  />
);

export {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
};
