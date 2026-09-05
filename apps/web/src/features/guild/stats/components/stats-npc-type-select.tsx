import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { TRACKABLE_NPC_TYPES } from "../constants";
export function StatsNpcTypeSelect({
  value,
  onValueChange,
}: {
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <Select
      value={value ?? "ALL"}
      onValueChange={onValueChange}
      items={[
        { value: "ALL", label: <>{t("kills.filters.allTypes")}</> },
        ...TRACKABLE_NPC_TYPES.map((type) => ({
          value: type,
          label: <>{t(`npcType.${type}`)}</>,
        })),
      ]}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">{t("kills.filters.allTypes")}</SelectItem>
        {TRACKABLE_NPC_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {t(`npcType.${type}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
