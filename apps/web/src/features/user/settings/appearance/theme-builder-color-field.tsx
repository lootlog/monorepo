interface ThemeBuilderColorFieldProps {
  label: string;
  token: string;
  value: string;
  advanced: boolean;
  onChange: (value: string) => void;
}

export const ThemeBuilderColorField = ({
  label,
  token,
  value,
  advanced,
  onChange,
}: ThemeBuilderColorFieldProps) => (
  <label className="grid min-h-11 grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-2 rounded-xl border border-border bg-background p-2 text-xs focus-within:border-input-focus focus-within:ring-2 focus-within:ring-ring">
    <input
      type="color"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="row-span-2 size-8 cursor-pointer rounded-lg border-0 bg-transparent p-0"
      aria-label={label}
    />
    <span className="min-w-0 truncate font-medium text-foreground">
      {label}
    </span>
    {advanced ? (
      <span className="font-mono text-[10px] uppercase text-muted-foreground">
        {token} · {value}
      </span>
    ) : null}
  </label>
);
