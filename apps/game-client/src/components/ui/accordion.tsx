import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "cn";
import { useSettingsStore } from "@/store/settings.store";

type SingleAccordionProps = Omit<
  BaseAccordion.Root.Props<string>,
  "defaultValue" | "multiple" | "onValueChange" | "value"
> & {
  collapsible?: boolean;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  type: "single";
  value?: string;
};

type MultipleAccordionProps = Omit<
  BaseAccordion.Root.Props<string>,
  "defaultValue" | "multiple" | "onValueChange" | "value"
> & {
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  type: "multiple";
  value?: string[];
};

type AccordionProps = SingleAccordionProps | MultipleAccordionProps;

function Accordion(props: AccordionProps) {
  if (props.type === "multiple") {
    const { type: _type, ...multipleProps } = props;
    return <BaseAccordion.Root multiple {...multipleProps} />;
  }

  const {
    collapsible = false,
    defaultValue,
    onValueChange,
    type: _type,
    value,
    ...singleProps
  } = props;

  return (
    <BaseAccordion.Root
      {...singleProps}
      defaultValue={defaultValue === undefined ? undefined : [defaultValue]}
      value={value === undefined ? undefined : value ? [value] : []}
      onValueChange={(nextValue, eventDetails) => {
        if (!collapsible && nextValue.length === 0) {
          eventDetails.cancel();
          return;
        }

        onValueChange?.(nextValue[0] ?? "");
      }}
    />
  );
}

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  BaseAccordion.Item.Props
>(({ className, disabled, ...props }, ref) => (
  <BaseAccordion.Item
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
  HTMLButtonElement,
  BaseAccordion.Trigger.Props
>(({ className, children, disabled, ...props }, ref) => (
  <BaseAccordion.Header className="ll:flex">
    <BaseAccordion.Trigger
      ref={ref}
      className={cn(
        "ll:flex ll:w-full ll:items-center ll:justify-between ll:py-2 ll:px-3 ll:text-sm ll:font-medium ll:text-white ll:transition-all ll:hover:bg-gray-400/20 ll:border ll:border-gray-400 ll:rounded-sm ll-custom-cursor-pointer ll:bg-transparent ll:[&[data-panel-open]>svg]:rotate-180",
        disabled && "ll:cursor-not-allowed ll:hover:bg-transparent",
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
      <ChevronDown className="ll:h-4 ll:w-4 ll:shrink-0 ll:text-white ll:transition-transform ll:duration-200" />
    </BaseAccordion.Trigger>
  </BaseAccordion.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  BaseAccordion.Panel.Props
>(({ className, children, ...props }, ref) => {
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );

  return (
    <BaseAccordion.Panel
      ref={ref}
      className={cn(
        "ll:overflow-hidden ll:origin-top",
        animationEffectsEnabled &&
          "data-[starting-style]:ll:animate-in data-[starting-style]:ll:fade-in-0 data-[starting-style]:ll:zoom-in-95 data-[starting-style]:ll:duration-150 data-[ending-style]:ll:animate-out data-[ending-style]:ll:fade-out-0 data-[ending-style]:ll:zoom-out-95 data-[ending-style]:ll:duration-100",
        className,
      )}
      {...props}
    >
      <div className="ll:pt-2 ll:pb-4 ll:px-3">{children}</div>
    </BaseAccordion.Panel>
  );
});
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
