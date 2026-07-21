import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";
import { getLootlogPortalContainer } from "./theme-boundary";

const TooltipProviderContext = React.createContext(false);

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipProviderContext.Provider value>
      <TooltipPrimitive.Provider
        data-slot="tooltip-provider"
        delayDuration={delayDuration}
        {...props}
      />
    </TooltipProviderContext.Provider>
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const hasProvider = React.useContext(TooltipProviderContext);
  const tooltip = (
    <TooltipPrimitive.Root
      data-slot="tooltip"
      disableHoverableContent
      {...props}
    />
  );

  if (hasProvider) {
    return tooltip;
  }

  return <TooltipProvider>{tooltip}</TooltipProvider>;
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 8,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal container={getLootlogPortalContainer()}>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          "ll:bg-black/80 ll:font-[arimo] ll:border ll:border-gray-400 ll:text-white ll:animate-in ll:fade-in-0 ll:zoom-in-95 data-[state=closed]:ll:animate-out data-[state=closed]:ll:fade-out-0 data-[state=closed]:ll:zoom-out-95 data-[side=bottom]:ll:slide-in-from-top-2 data-[side=left]:ll:slide-in-from-right-2 data-[side=right]:ll:slide-in-from-left-2 data-[side=top]:ll:slide-in-from-bottom-2 ll:z-[500] ll:w-fit ll:origin-(--radix-tooltip-content-transform-origin) ll:rounded-sm ll:px-2 ll:py-1.5 ll:text-xs ll:text-balance",
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
