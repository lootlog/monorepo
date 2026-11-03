import type { ComponentProps } from "react";
import { Input } from "@lootlog/ui/components/input";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { t } from "@/i18n/messages";
import { MAX_CHARACTER_LEVEL } from "@/lib/equipment-set";

type CharacterLevelInputProps = Pick<
  ComponentProps<typeof Input>,
  "id" | "size" | "className" | "aria-label" | "aria-describedby"
>;

/**
 * The set's character level, which its requirements and elastic items
 * follow. Text that is no level forgets it.
 */
export function CharacterLevelInput(props: CharacterLevelInputProps) {
  const { set, setCharacter } = useEquipmentSet();

  return (
    <Input
      {...props}
      type="number"
      inputMode="numeric"
      min={1}
      max={MAX_CHARACTER_LEVEL}
      placeholder={t("equipment.levelPlaceholder")}
      value={set.level ?? ""}
      onChange={(event) => {
        const level = Number.parseInt(event.target.value, 10);

        setCharacter({
          profession: set.profession,
          level:
            Number.isInteger(level) && level > 0 && level <= MAX_CHARACTER_LEVEL
              ? level
              : null,
        });
      }}
    />
  );
}
