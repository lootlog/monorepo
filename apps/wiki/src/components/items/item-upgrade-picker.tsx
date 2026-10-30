import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { t } from "@/i18n/messages";
import {
  UPGRADE_LEVELS,
  type UpgradeLevel,
  upgradedItemLevel,
} from "@/lib/item-upgrade";

type ItemUpgradePickerProps = {
  /** The item's own level, which the upgrade raises its stats from. */
  itemLevel: number;
  value: UpgradeLevel;
  onChange: (upgrade: UpgradeLevel) => void;
};

/** The item's upgrade level, +0 to +5, as one row of buttons. */
export function ItemUpgradePicker({
  itemLevel,
  value,
  onChange,
}: ItemUpgradePickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span id="item-upgrade" className="text-sm font-medium text-foreground">
          {t("upgrade.label")}
        </span>
        <span aria-live="polite" className="text-xs text-muted-foreground">
          {value === 0
            ? t("upgrade.none")
            : t("upgrade.virtualLevel", {
                level: upgradedItemLevel(itemLevel, value),
              })}
        </span>
      </div>
      <ToggleGroup
        variant="outline"
        size="sm"
        spacing={0}
        value={[String(value)]}
        onValueChange={(values) => {
          const upgrade = UPGRADE_LEVELS.find(
            (level) => String(level) === values[0],
          );

          // Pressing the chosen level again keeps it.
          if (upgrade !== undefined) onChange(upgrade);
        }}
        aria-labelledby="item-upgrade"
        className="w-full"
      >
        {UPGRADE_LEVELS.map((level) => (
          <ToggleGroupItem
            key={level}
            value={String(level)}
            className="flex-1 tabular-nums aria-pressed:bg-primary/12 aria-pressed:text-primary"
          >
            {t("upgrade.level", { level })}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
