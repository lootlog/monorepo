import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@lootlog/ui/components/field";
import { RadioGroup, RadioGroupItem } from "@lootlog/ui/components/radio-group";
import { cn } from "cn";
import type { LucideIcon } from "lucide-react";

export type OptionCard<Value extends string> = {
  value: Value;
  icon: LucideIcon;
  title: string;
  description: string;
  /** The icon's colour; the primary colour by default. */
  iconClassName?: string;
  iconBackgroundClassName?: string;
  /** The ring and border of the chosen card. */
  activeClassName?: string;
};

type OptionCardGroupProps<Value extends string> = {
  options: OptionCard<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  "aria-labelledby"?: string;
  disabled?: boolean;
  className?: string;
};

/** A choice between a few modes, each a card with an icon and a description. */
export const OptionCardGroup = <Value extends string>({
  options,
  value,
  onChange,
  "aria-labelledby": ariaLabelledBy,
  disabled,
  className,
}: OptionCardGroupProps<Value>) => (
  <RadioGroup
    aria-labelledby={ariaLabelledBy}
    value={value}
    disabled={disabled}
    onValueChange={(nextValue) => {
      const option = options.find((item) => item.value === nextValue);

      if (option) onChange(option.value);
    }}
    className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}
  >
    {options.map((option) => {
      const isActive = value === option.value;
      const Icon = option.icon;

      return (
        <FieldLabel key={option.value} className="cursor-pointer">
          <Field
            orientation="horizontal"
            className={cn(
              "items-center rounded-lg border bg-card p-3 transition-[border-color,box-shadow,opacity]",
              isActive
                ? cn(
                    "ring-1",
                    option.activeClassName ?? "border-primary ring-primary/30",
                  )
                : "border-border bg-card opacity-70 hover:opacity-90",
            )}
          >
            <RadioGroupItem value={option.value} aria-label={option.title} />
            <div
              className={cn(
                "rounded-xl p-2",
                option.iconBackgroundClassName ?? "bg-primary/10",
              )}
            >
              <Icon
                className={cn("size-4", option.iconClassName ?? "text-primary")}
              />
            </div>
            <FieldContent>
              <FieldTitle>{option.title}</FieldTitle>
              <FieldDescription className="text-xs leading-tight">
                {option.description}
              </FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
      );
    })}
  </RadioGroup>
);
