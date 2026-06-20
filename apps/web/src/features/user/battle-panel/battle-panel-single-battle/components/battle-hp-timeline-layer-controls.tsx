import { battleHpTimelineEventIconByKey } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-event-icons";
import {
  BATTLE_HP_TIMELINE_LAYER_DEFINITIONS,
  type BattleHpTimelineLayerConfig,
  type BattleHpTimelineLayerKey,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-layers";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Separator } from "@lootlog/ui/components/separator";
import { Switch } from "@lootlog/ui/components/switch";
import { cn } from "@lootlog/ui/lib/utils";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

type BattleHpTimelineLayerControlsProps = {
  config: BattleHpTimelineLayerConfig;
  layerCounts: Partial<Record<BattleHpTimelineLayerKey, number>>;
  onLayerVisibilityChange: (
    key: BattleHpTimelineLayerKey,
    visible: boolean,
  ) => void;
  onReset: () => void;
};

export function BattleHpTimelineLayerControls({
  config,
  layerCounts,
  onLayerVisibilityChange,
  onReset,
}: BattleHpTimelineLayerControlsProps) {
  const { t } = useTranslation();

  return (
    <aside className="flex min-h-0 flex-col border-t bg-card/40 lg:w-72 lg:border-l lg:border-t-0">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <SlidersHorizontal className="size-4 shrink-0 text-primary" />
          <h3 className="truncate text-sm font-semibold">
            {t("battlePanel.single.chart.layers.title")}
          </h3>
        </div>
        <Button
          aria-label={t("battlePanel.single.chart.layers.reset")}
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={onReset}
        >
          <RotateCcw className="size-3.5" />
        </Button>
      </div>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1 p-3">
          {BATTLE_HP_TIMELINE_LAYER_DEFINITIONS.map((definition) => {
            const Icon = battleHpTimelineEventIconByKey[definition.key];
            const count = layerCounts[definition.key] ?? 0;
            const id = `battle-hp-timeline-layer-${definition.key}`;

            return (
              <div
                key={definition.key}
                className={cn(
                  "flex items-center gap-3 rounded-sm border border-transparent px-2.5 py-2 transition-colors hover:border-border hover:bg-background/70",
                  count === 0 && "text-muted-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className="grid size-7 shrink-0 place-items-center rounded-full border bg-background"
                  style={{ borderColor: definition.color }}
                >
                  <Icon
                    className="size-3.5"
                    color={definition.color}
                    strokeWidth={2.4}
                  />
                </span>
                <label
                  className="min-w-0 flex-1 cursor-pointer truncate text-sm"
                  htmlFor={id}
                >
                  {t(definition.labelKey)}
                </label>
                <Badge
                  variant="outline"
                  className="min-w-8 justify-center rounded-sm px-1.5"
                >
                  {count}
                </Badge>
                <Switch
                  id={id}
                  checked={config[definition.key]}
                  onCheckedChange={(checked) =>
                    onLayerVisibilityChange(definition.key, checked)
                  }
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
