import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";

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

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> & {
    disabled?: boolean;
  }
>(({ className, disabled, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(
      disabled && "ll:opacity-50 ll:pointer-events-none",
      className,
    )}
    disabled={disabled}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & {
    disabled?: boolean;
  }
>(({ className, children, disabled, ...props }, ref) => (
  <AccordionPrimitive.Header className="ll:flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "ll:flex ll:w-full ll:items-center ll:justify-between ll:py-2 ll:px-3 ll:text-sm ll:font-medium ll:text-white ll:transition-all ll:hover:bg-gray-400/20 ll:border ll:border-gray-400 ll:rounded-sm ll-custom-cursor-pointer ll:bg-transparent ll:[&[data-state=open]>svg]:rotate-180",
        disabled && "ll:cursor-not-allowed ll:hover:bg-transparent",
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
      <ChevronDown className="ll:h-4 ll:w-4 ll:shrink-0 ll:text-white ll:transition-transform ll:duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useImperativeHandle(ref, () => contentRef.current!);

  React.useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const observer = new MutationObserver(() => {
      const state = element.getAttribute("data-state");
      setIsOpen(state === "open");
    });

    observer.observe(element, {
      attributes: true,
      attributeFilter: ["data-state"],
    });

    const initialState = element.getAttribute("data-state");
    setIsOpen(initialState === "open");

    return () => observer.disconnect();
  }, []);

  return (
    <AccordionPrimitive.Content
      ref={contentRef}
      className={cn("ll:overflow-hidden", className)}
      {...props}
    >
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={CONTENT_ANIMATION}
          >
            <div className="ll:pt-2 ll:pb-4 ll:px-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </AccordionPrimitive.Content>
  );
});
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
