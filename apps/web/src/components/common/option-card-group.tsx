import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@lootlog/ui/components/field";
import { RadioGroup, RadioGroupItem } from "@lootlog/ui/components/radio-group";
import { cn } from "cn";

export type OptionCard<Value extends string> = {
  value: Value;
  title: string;
  description: string;
};

type OptionCardGroupProps<Value extends string> = {
  options: OptionCard<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  "aria-labelledby"?: string;
  disabled?: boolean;
  className?: string;
};

/** A choice between a few modes, each a card with a title and a description. */
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
    {options.map((option) => (
      // The label draws the card; a chosen card takes a clear primary border.
      <FieldLabel
        key={option.value}
        className="cursor-pointer has-data-checked:border-primary/60 dark:has-data-checked:border-primary/60"
      >
        <Field orientation="horizontal" className="items-center">
          <RadioGroupItem value={option.value} aria-label={option.title} />
          <FieldContent>
            <FieldTitle>{option.title}</FieldTitle>
            <FieldDescription className="text-xs leading-tight">
              {option.description}
            </FieldDescription>
          </FieldContent>
        </Field>
      </FieldLabel>
    ))}
  </RadioGroup>
);
