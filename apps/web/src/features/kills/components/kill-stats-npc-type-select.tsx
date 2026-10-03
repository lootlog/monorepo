import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { Skull } from "lucide-react";
import { useTranslation } from "react-i18next";

const ALL_NPC_TYPES = "ALL";

type KillStatsNpcTypeSelectProps = {
  /** The NPC types this page tracks; guild and personal kill stats differ. */
  types: readonly string[];
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  width?: string;
};

export const KillStatsNpcTypeSelect = ({
  types,
  value,
  onValueChange,
  width = "w-[200px]",
}: KillStatsNpcTypeSelectProps) => {
  const { t } = useTranslation();

  return (
    <FilterPopover
      icon={Skull}
      options={[
        { value: ALL_NPC_TYPES, label: t("kills.filters.allTypes") },
        ...types.map((type) => ({
          value: type,
          label: t(`npcType.${type}`),
        })),
      ]}
      value={value ?? ALL_NPC_TYPES}
      onValueChange={onValueChange}
      placeholder={t("kills.filters.npcType")}
      emptyMessage={t("common.noResults")}
      width={width}
      triggerClassName="h-10"
      showSearch={false}
    />
  );
};
