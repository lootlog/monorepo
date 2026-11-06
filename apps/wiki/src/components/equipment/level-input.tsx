import type { ComponentProps } from "react";
import { Input } from "@lootlog/ui/components/input";
import { t } from "@/i18n/messages";
import { isCharacterLevel, MAX_CHARACTER_LEVEL } from "@/lib/equipment-set";

type LevelInputProps = Pick<
  ComponentProps<typeof Input>,
  "id" | "size" | "className" | "aria-label" | "aria-describedby"
> & {
  value: number | undefined;
  /** The level typed; text that is no level is `undefined`. */
  onChange: (level: number | undefined) => void;
  placeholder?: string;
};

/** A character level field. */
export function LevelInput({
  value,
  onChange,
  placeholder = t("equipment.levelPlaceholder"),
  ...props
}: LevelInputProps) {
  return (
    <Input
      {...props}
      type="number"
      inputMode="numeric"
      min={1}
      max={MAX_CHARACTER_LEVEL}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(event) => {
        const level = Number.parseInt(event.target.value, 10);

        onChange(isCharacterLevel(level) ? level : undefined);
      }}
    />
  );
}
