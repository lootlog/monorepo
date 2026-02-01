import { Button } from "@lootlog/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { useTranslation } from "react-i18next";
import type {
  NpcType,
  GuildKillStatsFilters,
} from "../hooks/use-guild-kill-stats";

const NPC_TYPES: NpcType[] = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "ELITE3",
  "ELITE2",
  "ELITE",
  "COMMON",
];

type KillStatsFiltersProps = {
  filters: GuildKillStatsFilters;
  onFiltersChange: (filters: GuildKillStatsFilters) => void;
};

export const KillStatsFilters: React.FC<KillStatsFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const { t } = useTranslation();

  const toggleNpcType = (type: NpcType) => {
    const currentTypes = filters.npcTypes ?? [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];

    onFiltersChange({
      ...filters,
      npcTypes: newTypes.length > 0 ? newTypes : undefined,
    });
  };

  const handleMinLvlChange = (value: string) => {
    const numValue = value ? Number.parseInt(value, 10) : undefined;
    onFiltersChange({
      ...filters,
      minLvl: Number.isNaN(numValue) ? undefined : numValue,
    });
  };

  const handleMaxLvlChange = (value: string) => {
    const numValue = value ? Number.parseInt(value, 10) : undefined;
    onFiltersChange({
      ...filters,
      maxLvl: Number.isNaN(numValue) ? undefined : numValue,
    });
  };

  const handleReset = () => {
    onFiltersChange({});
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          {t("kills.filters.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t("kills.filters.npcType")}
          </Label>
          <div className="flex flex-wrap gap-2">
            {NPC_TYPES.map((type) => (
              <label
                key={type}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={filters.npcTypes?.includes(type) ?? false}
                  onCheckedChange={() => toggleNpcType(type)}
                />
                {t(`npcType.${type}`)}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t("kills.filters.levelRange")}
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={t("kills.filters.minLevel")}
              value={filters.minLvl ?? ""}
              onChange={(e) => handleMinLvlChange(e.target.value)}
              className="w-24"
            />
            <span className="self-center">-</span>
            <Input
              type="number"
              placeholder={t("kills.filters.maxLevel")}
              value={filters.maxLvl ?? ""}
              onChange={(e) => handleMaxLvlChange(e.target.value)}
              className="w-24"
            />
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleReset}>
          {t("kills.filters.reset")}
        </Button>
      </CardContent>
    </Card>
  );
};
