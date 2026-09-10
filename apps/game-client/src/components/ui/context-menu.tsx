import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import * as React from "react";
import { cn } from "cn";
import { getLootlogPortalContainer } from "./theme-boundary";

const ContextMenu = BaseContextMenu.Root;

type ContextMenuTriggerProps = Omit<BaseContextMenu.Trigger.Props, "render"> & {
  asChild?: boolean;
};

const ContextMenuTrigger = React.forwardRef<
  HTMLDivElement,
  ContextMenuTriggerProps
>(({ asChild, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return <BaseContextMenu.Trigger ref={ref} render={children} {...props} />;
  }

  return (
    <BaseContextMenu.Trigger ref={ref} {...props}>
      {children}
    </BaseContextMenu.Trigger>
  );
});

ContextMenuTrigger.displayName = "ContextMenuTrigger";

type ContextMenuContentProps = BaseContextMenu.Popup.Props &
  Pick<BaseContextMenu.Positioner.Props, "collisionPadding">;

const ContextMenuContent = React.forwardRef<
  HTMLDivElement,
  ContextMenuContentProps
>(({ className, collisionPadding = 8, ...props }, ref) => (
  <BaseContextMenu.Portal container={getLootlogPortalContainer()}>
    <BaseContextMenu.Positioner
      className="ll:z-[500]"
      collisionPadding={collisionPadding}
    >
      <BaseContextMenu.Popup
        ref={ref}
        className={cn(
          "ll-action-menu ll:z-[500] ll:max-h-[var(--available-height)] ll:min-w-32 ll:overflow-y-auto ll:overflow-x-hidden ll:rounded-lg ll:border ll:border-solid ll:border-white/50 ll:p-0 ll:text-popover-foreground ll:shadow-md ll:animate-in ll:fade-in-0 ll:zoom-in-95 data-[ending-style]:ll:animate-out data-[ending-style]:ll:fade-out-0 data-[ending-style]:ll:zoom-out-95 data-[side=bottom]:ll:slide-in-from-top-2 data-[side=left]:ll:slide-in-from-right-2 data-[side=right]:ll:slide-in-from-left-2 data-[side=top]:ll:slide-in-from-bottom-2 ll:origin-[var(--transform-origin)] ll:bg-popover ll:flex ll:flex-col ll:gap-0 ll:text-xs",
          className,
        )}
        {...props}
      />
    </BaseContextMenu.Positioner>
  </BaseContextMenu.Portal>
));

ContextMenuContent.displayName = "ContextMenuContent";

type ContextMenuItemProps = BaseContextMenu.Item.Props & {
  inset?: boolean;
  onSelect?: React.MouseEventHandler<HTMLElement>;
};

const ContextMenuItem = React.forwardRef<HTMLElement, ContextMenuItemProps>(
  ({ className, inset, onClick, onSelect, ...props }, ref) => (
    <BaseContextMenu.Item
      ref={ref}
      className={cn(
        "ll:relative ll:flex ll-custom-cursor-pointer ll:select-none ll:items-center ll:rounded-none ll:outline-none ll:data-[disabled]:pointer-events-none ll:data-[disabled]:opacity-50 ll:text-popover-foreground ll:data-[highlighted]:bg-muted ll:hover:bg-muted ll:focus-visible:bg-muted ll:text-[11px] ll:font-semibold ll:border-0 ll:box-border ll:min-h-6 ll:py-1.5 ll:px-2",
        inset && "ll:pl-8",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        onSelect?.(event);

        if (event.defaultPrevented) {
          event.preventBaseUIHandler();
        }
      }}
      {...props}
    />
  ),
);

ContextMenuItem.displayName = "ContextMenuItem";

export { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem };
