import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useTranslation } from "react-i18next";
import type { BattleStatDefinition } from "@/types/stats-customization.types";
import { SearchInput } from "@/components/ui/search-input";

interface AvailableStatsSectionProps {
  availableStats: BattleStatDefinition[];
  onAddStat: (statKey: string) => void;
}

export const AvailableStatsSection = ({
  availableStats,
  onAddStat,
}: AvailableStatsSectionProps) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = searchQuery.toLocaleLowerCase("pl-PL");

  const filteredAvailableStats = availableStats.filter((stat) =>
    t(stat.labelKey).toLocaleLowerCase("pl-PL").includes(normalizedSearchQuery),
  );

  if (availableStats.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-2 font-medium">
        {t("battleUi.customization.availableStats")}
      </div>
      <SearchInput
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={t("battleUi.customization.searchStat")}
        className="h-7 text-xs"
        wrapperClassName="mb-2"
        endAdornment={
          searchQuery ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchQuery("")}
              className="size-6 hover:bg-transparent"
              aria-label={t("common.clear")}
            >
              <X className="h-3 w-3" />
            </Button>
          ) : null
        }
      />
      <ScrollArea className="h-48">
        <div className="space-y-1 pr-4">
          {filteredAvailableStats.length > 0 ? (
            filteredAvailableStats.map((stat) => (
              <div
                key={String(stat.key)}
                className="flex items-center gap-2 bg-background border rounded px-2 py-1.5 text-sm"
              >
                <span className="flex-1">{t(stat.labelKey)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddStat(String(stat.key))}
                  className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground italic py-2 text-center">
              {t("battleUi.customization.noStatsFound")}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
