import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const CONTENT_ANIMATION: Variants = {
  initial: {
    opacity: 0,
    scaleY: 0.95,
    transformOrigin: "top",
  },
  animate: {
    opacity: 1,
    scaleY: 1,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    scaleY: 0.95,
    transition: {
      duration: 0.1,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

const CollapsibleTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleTrigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleTrigger>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(CollapsibleContext);

  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      ref={ref}
      className={cn(
        "ll:flex ll:w-full ll:items-center ll:justify-between ll:py-2 ll:px-3 ll:text-sm ll:font-medium ll:text-white ll:transition-all ll:hover:bg-gray-400/20 ll:border ll:border-gray-400 ll:rounded-sm ll-custom-cursor-pointer ll:bg-transparent",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown
        className={cn(
          "ll:h-4 ll:w-4 ll:shrink-0 ll:text-white ll:transition-transform ll:duration-200",
          context?.isOpen && "ll:rotate-180",
        )}
      />
    </CollapsiblePrimitive.CollapsibleTrigger>
  );
});
CollapsibleTrigger.displayName =
  CollapsiblePrimitive.CollapsibleTrigger.displayName;

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(CollapsibleContext);

  return (
    <AnimatePresence initial={false}>
      {context?.isOpen && (
        <CollapsiblePrimitive.CollapsibleContent
          ref={ref}
          forceMount
          className={cn("ll:overflow-hidden", className)}
          {...props}
        >
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={CONTENT_ANIMATION}
          >
            <div className="ll:pt-2 ll:pb-4 ll:px-3">{children}</div>
          </motion.div>
        </CollapsiblePrimitive.CollapsibleContent>
      )}
    </AnimatePresence>
  );
});
CollapsibleContent.displayName =
  CollapsiblePrimitive.CollapsibleContent.displayName;

interface CollapsibleContextValue {
  isOpen: boolean;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(
  null,
);

const CollapsibleRoot = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root>
>(({ children, open, defaultOpen, onOpenChange, ...props }, ref) => {
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false);

  const isOpen = isControlled ? open : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <CollapsibleContext.Provider value={{ isOpen }}>
      <CollapsiblePrimitive.Root
        ref={ref}
        open={isOpen}
        onOpenChange={handleOpenChange}
        {...props}
      >
        {children}
      </CollapsiblePrimitive.Root>
    </CollapsibleContext.Provider>
  );
});
CollapsibleRoot.displayName = "Collapsible";

export {
  CollapsibleRoot as Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
};
