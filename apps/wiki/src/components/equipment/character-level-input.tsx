import type { ComponentProps } from "react";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { LevelInput } from "./level-input";

type CharacterLevelInputProps = Omit<
  ComponentProps<typeof LevelInput>,
  "value" | "onChange" | "placeholder"
>;

export function CharacterLevelInput(props: CharacterLevelInputProps) {
  const { set, setCharacter } = useEquipmentSet();

  return (
    <LevelInput
      {...props}
      value={set.level ?? undefined}
      onChange={(level) =>
        setCharacter({ profession: set.profession, level: level ?? null })
      }
    />
  );
}
