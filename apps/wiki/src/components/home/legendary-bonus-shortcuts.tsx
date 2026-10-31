import { t } from "@/i18n/messages";
import { SEARCHABLE_LEGENDARY_BONUSES } from "@/lib/legendary-bonuses";
import { ShortcutTile } from "./shortcut-tile";

/** Opens the item search filtered to one legendary bonus. */
export function LegendaryBonusShortcuts() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {SEARCHABLE_LEGENDARY_BONUSES.map(({ name, icon, isUpcoming }) => (
        <li key={name}>
          <ShortcutTile
            icon={icon}
            label={t(`legendaryBonus.${name}`)}
            search={{ bonuses: name }}
            toneClassName="text-emerald-400"
            lockedLabel={isUpcoming ? t("home.bonusUpcoming") : undefined}
          />
        </li>
      ))}
    </ul>
  );
}
