import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { NpcTile } from "@/components/tiles/npc-tile";
import {
  Calendar,
  ExternalLink,
  MapPin,
  MessageSquare,
  Package,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@lootlog/ui/lib/utils";
import type { ThemePreviewViewport } from "./theme-builder-preview-types";
import type { ThemePreviewLootFixture } from "./theme-preview-fixtures";

interface ThemePreviewLootCardProps {
  fixture: ThemePreviewLootFixture;
  viewport: ThemePreviewViewport;
}

export const ThemePreviewLootCard = ({
  fixture,
  viewport,
}: ThemePreviewLootCardProps) => {
  const { t } = useTranslation();
  const isCompact = viewport !== "desktop";

  return (
    <Card
      data-slot="preview-loot-card"
      className="group relative flex h-full flex-col gap-0 overflow-visible border-border bg-card px-4 pb-1 pt-2 transition-[background-color,border-color,box-shadow] hover:border-input-focus hover:bg-surface-hover"
    >
      <header className="mb-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <NpcTile
            className="[&_img]:max-h-8 [&_img]:max-w-7 [&_img]:rounded-md"
            npc={{
              icon: fixture.npcIcon,
              lvl: fixture.npcLevel,
              name: t(
                `settings.appearance.preview.loots.npcs.${fixture.npcKey}`,
              ),
            }}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {t(`settings.appearance.preview.loots.npcs.${fixture.npcKey}`)} (
              {fixture.npcLevel})
            </p>
            <Badge variant="outline" className="mt-1 h-5 text-[10px]">
              {t(`npcType.${fixture.npcType}`)}
            </Badge>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button type="button" size="sm" variant="secondary" className="h-8">
            <MessageSquare />
            {fixture.comments}
          </Button>
          <Button type="button" size="sm" variant="secondary" className="h-8">
            <ExternalLink />
            {t("loots.list.details")}
          </Button>
        </div>
      </header>
      <div
        className={cn(
          "-mx-4 flex flex-1 items-start gap-3 border-y border-border/70 px-4 py-3",
          isCompact && "flex-wrap",
        )}
      >
        <div
          className={cn(
            "ml-auto flex min-w-0 flex-col items-end gap-1",
            isCompact &&
              "order-first ml-0 w-full flex-row items-center justify-between border-b border-border/70 pb-2",
          )}
        >
          <span className="max-w-44 truncate text-sm font-semibold">
            {t(
              `settings.appearance.preview.lootFixtures.${fixture.itemKey}.name`,
            )}
          </span>
          <Badge
            variant={
              fixture.rarity === "LEGENDARY" ? "destructive" : "secondary"
            }
          >
            {t(`itemRarity.${fixture.rarity}`)}
          </Badge>
        </div>
        {fixture.playerKeys.map((player, index) => (
          <div
            key={player}
            className="flex min-w-0 flex-col items-center gap-1"
          >
            <div className="grid size-10 place-items-center rounded-lg border border-border bg-secondary text-xs font-bold text-secondary-foreground">
              {t(`settings.appearance.preview.loots.playerInitials.${player}`)}
            </div>
            <span className="max-w-20 truncate text-[11px] text-muted-foreground">
              {t(`settings.appearance.preview.loots.players.${player}`)}
            </span>
            <div
              className="grid size-9 place-items-center rounded-md border-2 border-input-focus bg-surface-selected text-xs font-bold text-foreground"
              title={t(
                `settings.appearance.preview.lootFixtures.${fixture.itemKey}.name`,
              )}
            >
              {index + 1}
            </div>
          </div>
        ))}
      </div>
      <footer className="flex min-h-8 flex-wrap items-center gap-x-4 gap-y-1 py-1 text-xs text-muted-foreground">
        <span className="flex min-w-0 flex-1 items-center gap-1">
          <MapPin className="size-3" />
          <span className="truncate">
            {t(
              `settings.appearance.preview.loots.locations.${fixture.locationKey}`,
            )}
          </span>
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="size-3" />
          {t(`settings.appearance.preview.loots.times.${fixture.timeKey}`)}
        </span>
        <span className="flex items-center gap-1">
          <Users className="size-3" /> {fixture.playerCount}
        </span>
        <span className="flex items-center gap-1">
          <Package className="size-3" /> {fixture.itemCount}
        </span>
      </footer>
    </Card>
  );
};
