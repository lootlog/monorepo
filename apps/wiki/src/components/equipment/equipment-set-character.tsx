import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { t } from "@/i18n/messages";
import type { Profession } from "@/lib/equipment-set";
import { PROFESSION_OPTIONS } from "@/lib/item-options";
import { CharacterLevelInput } from "./character-level-input";

const ANY_PROFESSION = "any";

const professionOptions = [
  { value: ANY_PROFESSION, label: t("equipment.anyProfession") },
  ...PROFESSION_OPTIONS.map((value) => ({
    value,
    label: t(`filters.professions.${value}`),
  })),
];

const isProfession = (value: string): value is Profession =>
  PROFESSION_OPTIONS.some((profession) => profession === value);

/** Who wears the set: the character's profession and level. */
export function EquipmentSetCharacter() {
  const { set, setCharacter } = useEquipmentSet();

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_4rem] gap-2">
      <Select
        value={set.profession ?? ANY_PROFESSION}
        onValueChange={(value) =>
          setCharacter({
            profession: value && isProfession(value) ? value : null,
            level: set.level,
          })
        }
        items={professionOptions}
      >
        <SelectTrigger
          size="sm"
          className="w-full"
          aria-label={t("equipment.profession")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {professionOptions.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <CharacterLevelInput size="sm" aria-label={t("equipment.level")} />
    </div>
  );
}
