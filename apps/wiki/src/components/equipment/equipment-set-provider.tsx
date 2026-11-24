import type { ReactNode } from "react";
import { EquipmentSetEditor } from "@/components/equipment/equipment-set-editor";
import { useSharedStoredState } from "@/hooks/use-shared-stored-state";
import {
  decodeEquipmentSet,
  EMPTY_EQUIPMENT_SET,
  encodeEquipmentSet,
  EQUIPMENT_SET_PARAM,
  LEGACY_EQUIPMENT_SET_PARAM,
} from "@/lib/equipment-set";

const STORED_SET = {
  storageKey: "lootlog-wiki-equipment-set",
  params: [EQUIPMENT_SET_PARAM, LEGACY_EQUIPMENT_SET_PARAM],
  encode: encodeEquipmentSet,
  decode: decodeEquipmentSet,
  empty: EMPTY_EQUIPMENT_SET,
};

export function EquipmentSetProvider({ children }: { children: ReactNode }) {
  const [set, update] = useSharedStoredState(STORED_SET);

  return (
    <EquipmentSetEditor set={set} update={update}>
      {children}
    </EquipmentSetEditor>
  );
}
