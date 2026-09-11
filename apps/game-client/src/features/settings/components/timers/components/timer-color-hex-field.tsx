import { Input } from "@/components/ui/input";
import { useState, type FC } from "react";

type TimerColorHexFieldProps = {
  id: string;
  label: string;
  hexLabel: string;
  /** Committed 6-digit HEX colour. */
  value: string;
  /** Live update while the native picker drags or a valid HEX is typed. */
  onChange: (color: string) => void;
  /** Persist the colour once the picker or the text field loses focus. */
  onCommit: (color: string) => void;
};

const HEX_COLOR_PATTERN = /^#[\dA-F]{6}$/i;

/**
 * Native colour picker paired with a HEX text field. The text field keeps its
 * own draft so a half-typed value never reaches the store; an invalid value
 * snaps back to the committed colour on blur.
 */
export const TimerColorHexField: FC<TimerColorHexFieldProps> = ({
  id,
  label,
  hexLabel,
  value,
  onChange,
  onCommit,
}) => {
  const [hexDraft, setHexDraft] = useState<{ source: string; text: string }>({
    source: value,
    text: value,
  });

  const text = hexDraft.source === value ? hexDraft.text : value;
  const setText = (next: string) => setHexDraft({ source: value, text: next });

  const commitText = (next: string) => {
    if (!HEX_COLOR_PATTERN.test(next)) {
      setText(value);

      return;
    }

    const normalized = next.toUpperCase();
    setText(normalized);
    onCommit(normalized);
  };

  return (
    <div className="ll:flex ll:min-w-0 ll:flex-col ll:gap-1">
      <label htmlFor={id} className="ll:text-[11px] ll:text-muted-foreground">
        {label}
      </label>
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

            if (HEX_COLOR_PATTERN.test(next)) onChange(next);
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
