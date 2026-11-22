import { Input } from "@/components/ui/input";
import { isHexAppearanceColor } from "@lootlog/schema/npc-appearance";
import { cn } from "cn";
import type { FC } from "react";
import { useSourceDraft } from "./use-source-draft";

type SettingsColorHexFieldProps = {
  id?: string;
  label: string;
  showLabel?: boolean;
  hexLabel: string;
  value: string;
  onChange: (color: string) => void;
  onCommit: (color: string) => void;
  className?: string;
};

export const SettingsColorHexField: FC<SettingsColorHexFieldProps> = ({
  id,
  label,
  showLabel = true,
  hexLabel,
  value,
  onChange,
  onCommit,
  className,
}) => {
  const [text, setText, clearDraft] = useSourceDraft(value, value);

  const commitText = (next: string) => {
    if (!isHexAppearanceColor(next)) {
      clearDraft();

      return;
    }

    const normalized = next.toUpperCase();
    setText(normalized);
    onCommit(normalized);
  };

  return (
    <div className={cn("ll:flex ll:min-w-0 ll:flex-col ll:gap-1", className)}>
      {showLabel ? (
        <label htmlFor={id} className="ll:text-[11px] ll:text-muted-foreground">
          {label}
        </label>
      ) : null}
      <div className="ll:flex ll:items-center ll:gap-1.5">
        <Input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          onBlur={() => onCommit(value)}
          className="ll:h-9 ll:w-12 ll:shrink-0 ll:border-border ll:p-1 ll:text-popover-foreground"
          aria-label={label}
        />
        <Input
          value={text}
          onChange={(event) => {
            const next = event.target.value.toUpperCase();
            setText(next);

            if (isHexAppearanceColor(next)) onChange(next);
          }}
          onBlur={(event) => commitText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              commitText(event.currentTarget.value);
              event.currentTarget.blur();
            }
          }}
          className="ll:min-w-0 ll:flex-1 ll:border-border ll:font-mono ll:uppercase ll:text-popover-foreground"
          aria-label={hexLabel}
        />
      </div>
    </div>
  );
};
