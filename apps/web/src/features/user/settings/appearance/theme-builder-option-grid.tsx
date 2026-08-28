import { Button } from "@lootlog/ui/components/button";

interface ThemeBuilderOptionGridProps<Option extends string> {
  label: string;
  options: readonly Option[];
  value: string;
  getOptionLabel: (option: Option) => string;
  onChange: (option: Option) => void;
}

export const ThemeBuilderOptionGrid = <Option extends string>({
  label,
  options,
  value,
  getOptionLabel,
  onChange,
}: ThemeBuilderOptionGridProps<Option>) => (
  <div className="space-y-2">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <div className="grid grid-cols-2 gap-2" role="group" aria-label={label}>
      {options.map((option) => (
        <Button
          key={option}
          type="button"
          size="sm"
          className="min-h-10 justify-start"
          variant={value === option ? "secondary" : "outline"}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {getOptionLabel(option)}
        </Button>
      ))}
    </div>
  </div>
);
