import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { cn } from "@/lib/utils"
import { ChevronDownIcon } from "@radix-ui/react-icons"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("ll-border-b", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="ll-flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "ll-flex ll-flex-1 ll-items-center ll-justify-between ll-py-4 ll-text-sm ll-font-medium ll-transition-all hover:ll-underline ll-text-left [&[data-state=open]>svg]:ll-rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="ll-h-4 ll-w-4 ll-shrink-0 ll-text-muted-foreground ll-transition-transform ll-duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="ll-overflow-hidden ll-text-sm data-[state=closed]:ll-animate-accordion-up data-[state=open]:ll-animate-accordion-down"
    {...props}
  >
    <div className={cn("ll-pb-4 ll-pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
