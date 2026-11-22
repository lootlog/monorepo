import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@lootlog/ui/components/context-menu";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useSetItemPicker } from "@/contexts/set-item-picker-context";
import type { WornItem } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import { itemPageParams, itemPageSearch } from "@/lib/catalog-links";
import type { EquipmentSlotId } from "@/lib/equipment-slots";
import {
  isUpgradable,
  isUpgradeBonusKey,
  UPGRADE_BONUS_GROUP_POWER,
  UPGRADE_LEVELS,
  upgradeBonusOptions,
} from "@lootlog/domain/item-upgrade";
import {
  formatUpgradeBonusValue,
  upgradeBonusName,
} from "@/lib/upgrade-bonus-text";
import { legendaryBonusIcon } from "@/lib/legendary-bonuses";
import { isSocketBonus } from "@lootlog/domain/item-socket";
import { useSocketOptions } from "@/hooks/use-socket-items";
import { hasItemStat } from "@lootlog/domain/item-stat";

type EquipmentSlotMenuProps = {
  slotId: EquipmentSlotId;
  worn: WornItem;
  className: string;
  children: ReactNode;
};

const NO_BONUS = "none";

export function EquipmentSlotMenu({
  slotId,
  worn,
  className,
  children,
}: EquipmentSlotMenuProps) {
  const { upgrade, unequip } = useEquipmentSet();
  const { pickItem } = useSetItemPicker();
  const { item } = worn;
  const canUpgrade = isUpgradable(item);
  const bonuses = upgradeBonusOptions(item);

  const { options: symbols } = useSocketOptions(worn.dropped);

  const noSymbol = hasItemStat(worn.dropped.stat, "socket_fleeting_legbon")
    ? t("socket.noneFleeting")
    : t("socket.none");

  return (
    <ContextMenu>
      <ContextMenuTrigger render={<div className={className} />}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuGroup>
          <ContextMenuLabel className="truncate">{item.name}</ContextMenuLabel>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        {canUpgrade ? (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                {t("upgrade.label")}
                <span className="ml-auto pl-3 text-xs text-muted-foreground tabular-nums">
                  {t("upgrade.level", { level: worn.upgrade.level })}
                </span>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-36">
                <ContextMenuRadioGroup
                  value={String(worn.upgrade.level)}
                  onValueChange={(value) => {
                    const level = UPGRADE_LEVELS.find(
                      (option) => String(option) === value,
                    );

                    if (level === undefined) return;

                    upgrade(slotId, {
                      ...worn.upgrade,
                      level,
                      bonus: level === 5 ? worn.upgrade.bonus : undefined,
                    });
                  }}
                >
                  {UPGRADE_LEVELS.map((level) => (
                    <ContextMenuRadioItem
                      key={level}
                      value={String(level)}
                      className="tabular-nums"
                    >
                      {t("upgrade.level", { level })}
                    </ContextMenuRadioItem>
                  ))}
                </ContextMenuRadioGroup>
              </ContextMenuSubContent>
            </ContextMenuSub>
            {bonuses.length > 0 ? (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  {t("upgrade.bonus")}
                  <span className="ml-auto truncate pl-3 text-xs text-muted-foreground">
                    {worn.upgrade.bonus
                      ? upgradeBonusName(worn.upgrade.bonus)
                      : t("upgrade.bonusNone")}
                  </span>
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="max-h-96 w-80">
                  <ContextMenuRadioGroup
                    value={worn.upgrade.bonus ?? NO_BONUS}
                    onValueChange={(value: string) =>
                      upgrade(
                        slotId,
                        isUpgradeBonusKey(value)
                          ? { ...worn.upgrade, level: 5, bonus: value }
                          : { ...worn.upgrade, bonus: undefined },
                      )
                    }
                  >
                    <ContextMenuRadioItem value={NO_BONUS}>
                      {t("upgrade.bonusNone")}
                    </ContextMenuRadioItem>
                    {UPGRADE_BONUS_GROUP_POWER.map((_power, group) => (
                      <ContextMenuGroup key={group}>
                        <ContextMenuSeparator />
                        <ContextMenuLabel className="text-xs font-medium text-muted-foreground">
                          {t(`upgrade.bonusGroups.${group}`)}
                        </ContextMenuLabel>
                        {bonuses
                          .filter((bonus) => bonus.group === group)
                          .map((bonus) => (
                            <ContextMenuRadioItem
                              key={bonus.key}
                              value={bonus.key}
                              className="gap-3"
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {upgradeBonusName(bonus.key)}
                              </span>
                              <span className="font-semibold text-primary tabular-nums">
                                {formatUpgradeBonusValue(bonus)}
                              </span>
                            </ContextMenuRadioItem>
                          ))}
                      </ContextMenuGroup>
                    ))}
                  </ContextMenuRadioGroup>
                  {worn.upgrade.level < 5 ? (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">
                      {t("upgrade.bonusPicksMax")}
                    </p>
                  ) : null}
                </ContextMenuSubContent>
              </ContextMenuSub>
            ) : null}
            <ContextMenuSeparator />
          </>
        ) : null}
        {symbols.length > 0 ? (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                {t("socket.label")}
                <span className="ml-auto truncate pl-3 text-xs text-muted-foreground">
                  {worn.upgrade.symbol
                    ? t(`legendaryBonus.${worn.upgrade.symbol}`)
                    : noSymbol}
                </span>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="max-h-96 w-64">
                <ContextMenuRadioGroup
                  value={worn.upgrade.symbol ?? NO_BONUS}
                  onValueChange={(value: string) =>
                    upgrade(slotId, {
                      ...worn.upgrade,
                      symbol: isSocketBonus(value) ? value : undefined,
                    })
                  }
                >
                  <ContextMenuRadioItem value={NO_BONUS}>
                    {noSymbol}
                  </ContextMenuRadioItem>
                  <ContextMenuSeparator />
                  {symbols.map(({ bonus }) => {
                    const Icon = legendaryBonusIcon(bonus);

                    return (
                      <ContextMenuRadioItem
                        key={bonus}
                        value={bonus}
                        className="gap-2"
                      >
                        <Icon
                          aria-hidden="true"
                          className="size-3.5 text-muted-foreground"
                        />
                        {t(`legendaryBonus.${bonus}`)}
                      </ContextMenuRadioItem>
                    );
                  })}
                </ContextMenuRadioGroup>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
          </>
        ) : null}
        <ContextMenuItem onClick={() => pickItem(slotId)}>
          {t("equipment.change")}
        </ContextMenuItem>
        <ContextMenuItem
          render={
            <Link
              to="/items/$itemSlug"
              params={itemPageParams(item)}
              search={itemPageSearch(worn.upgrade)}
            />
          }
        >
          {t("equipment.openItem")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => unequip(slotId)}>
          {t("equipment.takeOff")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
