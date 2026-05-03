import { useTranslation } from "react-i18next";
import { Label } from "@lootlog/ui/components/label";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";

type NpcKillersFiltersMobileProps = {
  world: string | null;
  onWorldChange: (value: string | null) => void;
};

export const NpcKillersFiltersMobile = ({
  world,
  onWorldChange,
}: NpcKillersFiltersMobileProps) => {
  const { t } = useTranslation();

  return (
    <MobileFiltersDrawer
      title={t("kills.filters.title")}
      closeLabel={t("kills.filters.close")}
    >
      <div className="space-y-2">
        <Label>{t("kills.filters.world")}</Label>
        <WorldSwitcher
          value={world}
          onValueChange={onWorldChange}
          showAllOption
          width="w-full"
        />
      </div>
    </MobileFiltersDrawer>
  );
};
