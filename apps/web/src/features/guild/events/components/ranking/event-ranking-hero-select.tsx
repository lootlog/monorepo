import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { cn } from "cn";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import type { EventHeroNpc, EventRanking } from "../../types/api";

type EventRankingHeroSelectProps = {
  heroes: EventHeroNpc[];
  rankings: EventRanking[];
  value: string | null;
  onValueChange: (heroName: string) => void;
};

/**
 * Picks the hero whose ranking a narrow column shows, with each hero's
 * player count; hidden while the event has one hero.
 */
export const EventRankingHeroSelect = ({
  heroes,
  rankings,
  value,
  onValueChange,
}: EventRankingHeroSelectProps) => {
  const { t } = useTranslation();

  if (heroes.length <= 1) return null;

  const options = heroes.map((hero) => ({
    value: hero.npcName,
    label: hero.npcName,
    playerCount: rankings.filter(
      (ranking) => ranking.heroNpcName === hero.npcName,
    ).length,
  }));

  return (
    <div
      className={cn(
        "border-b border-sidebar-border py-2",
        LIST_TILE_INSET_CLASS,
      )}
    >
      <Select
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue) onValueChange(nextValue);
        }}
        items={options}
      >
        <SelectTrigger
          aria-label={t("events.heroTabs.label")}
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              <span className="shrink-0 text-xs font-normal text-muted-foreground tabular-nums">
                {t("events.ranking.playerCount", { count: option.playerCount })}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
