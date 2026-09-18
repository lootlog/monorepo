import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { Skull } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TRACKABLE_NPC_TYPES } from "../constants";

type StatsNpcTypeSelectProps = {
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  width?: string;
};

export const StatsNpcTypeSelect = ({
  value,
  onValueChange,
  width = "w-[200px]",
}: StatsNpcTypeSelectProps) => {
  const { t } = useTranslation();

  return (
    <FilterPopover
      icon={Skull}
      options={[
        { value: "ALL", label: t("kills.filters.allTypes") },
        ...TRACKABLE_NPC_TYPES.map((type) => ({
          value: type,
          label: t(`npcType.${type}`),
        })),
      ]}
      value={value ?? "ALL"}
      onValueChange={onValueChange}
      placeholder={t("kills.filters.npcType")}
      emptyMessage={t("common.noResults")}
      width={width}
      triggerClassName="h-10"
      showSearch={false}
    />
  );
};
