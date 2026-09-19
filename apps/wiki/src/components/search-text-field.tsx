import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";

type SearchTextFieldProps = {
  label: string;
  min?: number;
  onValueChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  value: string;
};

export function SearchTextField({
  label,
  min,
  onValueChange,
  placeholder,
  type,
  value,
}: SearchTextFieldProps) {
  return (
    <Label className="grid gap-2">
      <span>{label}</span>
      <Input
        min={min}
        type={type}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
      />
    </Label>
  );
}
