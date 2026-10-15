import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Label } from "@lootlog/ui/components/label";
import { useTranslation } from "react-i18next";

type LootStatsExcludeColossusProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
};

/** The loot statistics checkbox that leaves colossus loot out. */
export const LootStatsExcludeColossus = ({
  id,
  checked,
  onCheckedChange,
}: LootStatsExcludeColossusProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <Label htmlFor={id} className="flex-1 cursor-pointer text-sm">
        {t("loots.stats.excludeColossus")}
      </Label>
    </div>
  );
};
