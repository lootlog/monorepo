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

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange],
  );

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

export { CollapsibleRoot as Collapsible, CollapsibleContent };
