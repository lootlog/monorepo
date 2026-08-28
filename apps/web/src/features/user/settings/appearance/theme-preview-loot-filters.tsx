import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Separator } from "@lootlog/ui/components/separator";
import { X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const RARITIES = ["LEGENDARY", "HEROIC", "UNIQUE"] as const;

interface ThemePreviewLootFiltersProps {
  onClose?: () => void;
}

export const ThemePreviewLootFilters = ({
  onClose,
}: ThemePreviewLootFiltersProps) => {
  const { t } = useTranslation();
  const [selectedRarities, setSelectedRarities] = useState<string[]>([
    "LEGENDARY",
  ]);

  return (
    <aside className="h-full w-80 shrink-0 p-3 pl-0">
      <Card className="flex h-full min-h-0 flex-col gap-0 overflow-hidden p-0">
        <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
          <strong className="text-sm">
            {t("loots.header.mobileFiltersTitle")}
          </strong>
          {onClose ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label={t("common.close")}
              onClick={onClose}
            >
              <X />
            </Button>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
          <section className="space-y-2">
            <Label>{t("loots.filtersPanel.quickFilters.title")}</Label>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {t("loots.filtersPanel.quickFilters.legendaryLabel")}
              </Badge>
              <Badge variant="outline">
                {t("loots.filtersPanel.quickFilters.titanLabel")}
              </Badge>
              <Badge variant="outline">
                {t("loots.filtersPanel.quickFilters.heroLabel")}
              </Badge>
            </div>
          </section>
          <Separator />
          <section className="space-y-3">
            <Label>{t("loots.filtersPanel.itemSection.title")}</Label>
            {RARITIES.map((rarity) => (
              <label
                key={rarity}
                className="flex min-h-9 items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={selectedRarities.includes(rarity)}
                  onCheckedChange={(checked) =>
                    setSelectedRarities((current) =>
                      checked === true
                        ? [...current, rarity]
                        : current.filter((value) => value !== rarity),
                    )
                  }
                />
                {t(`itemRarity.${rarity}`)}
              </label>
            ))}
          </section>
          <Separator />
          <section className="space-y-3">
            <Label htmlFor="preview-player-filter">
              {t("loots.filtersPanel.playersLabel")}
            </Label>
            <Input
              id="preview-player-filter"
              placeholder={t("loots.filtersPanel.playersPlaceholder")}
            />
          </section>
        </div>
        <div className="border-t p-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setSelectedRarities([])}
          >
            <X />
            {t("loots.filtersPanel.quickFilters.clearButton")}
          </Button>
        </div>
      </Card>
    </aside>
  );
};
