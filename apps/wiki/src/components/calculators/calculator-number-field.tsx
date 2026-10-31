import { useId } from "react";
import { Field, FieldLabel } from "@lootlog/ui/components/field";
import { Input } from "@lootlog/ui/components/input";

type CalculatorNumberFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step?: number;
};

/**
 * One number a calculator reads. It keeps the typed text, so a field can be
 * cleared and retyped; the calculator decides when the text is a number.
 */
export function CalculatorNumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: CalculatorNumberFieldProps) {
  const id = useId();

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        inputMode={step < 1 ? "decimal" : "numeric"}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}
