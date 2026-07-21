import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settings.store";

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
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );

  return (
    <AccordionPrimitive.Content
      ref={ref}
      className={cn(
        "ll:overflow-hidden ll:origin-top",
        animationEffectsEnabled &&
          "data-[state=open]:ll:animate-in data-[state=open]:ll:fade-in-0 data-[state=open]:ll:zoom-in-95 data-[state=open]:ll:duration-150 data-[state=closed]:ll:animate-out data-[state=closed]:ll:fade-out-0 data-[state=closed]:ll:zoom-out-95 data-[state=closed]:ll:duration-100",
        className,
      )}
      {...props}
    >
      <div className="ll:pt-2 ll:pb-4 ll:px-3">{children}</div>
    </AccordionPrimitive.Content>
  );
});
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
