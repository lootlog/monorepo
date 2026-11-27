import { t } from "@/i18n/messages";
import type { EquipmentSet } from "@/lib/equipment-set";
import { EQUIPMENT_SLOTS } from "@/lib/equipment-slots";

export const savedSetSummary = (set: EquipmentSet) =>
  [
    set.profession
      ? t(`filters.professions.${set.profession}`)
      : t("equipment.anyProfession"),
    ...(set.level === null ? [] : [t("savedSets.level", { level: set.level })]),
    t("savedSets.items", {
      worn: Object.keys(set.items).length,
      total: EQUIPMENT_SLOTS.length,
    }),
  ].join(" · ");
