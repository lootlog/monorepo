import { Input } from "@lootlog/ui/components/input";
import { useState } from "react";

type ColorHexFieldProps = {
  label: string;
  hexLabel: string;
  value: string;
  onChange: (color: string) => void;
};

const HEX_COLOR_PATTERN = /^#[\dA-F]{6}$/iu;

export const ColorHexField = ({
  label,
  hexLabel,
  value,
  onChange,
}: ColorHexFieldProps) => {
  const [draft, setDraft] = useState({ source: value, text: value });
  const text = draft.source === value ? draft.text : value;

  const setText = (next: string) => setDraft({ source: value, text: next });

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="color"
        value={value.toLowerCase()}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        aria-label={label}
        className="w-12 shrink-0 cursor-pointer p-1"
      />
      <Input
        value={text}
        aria-label={hexLabel}
        spellCheck={false}
        maxLength={7}
        className="w-28 font-mono text-xs uppercase"
        onChange={(event) => {
          const next = event.target.value.toUpperCase();
          setText(next);

          if (HEX_COLOR_PATTERN.test(next)) onChange(next);
        }}
        onBlur={() => setText(value)}
      />
    </div>
  );
};
