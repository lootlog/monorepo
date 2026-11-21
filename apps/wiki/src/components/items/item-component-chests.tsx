import { orderBy } from "es-toolkit";
import {
  chestComponents,
  type ComponentInfo,
  tierChests,
} from "@lootlog/domain/item-socket";
import { ArticleSection } from "@/components/article/article-section";
import { SocketItem } from "@/components/sockets/socket-item";
import { useSocketItems } from "@/hooks/use-socket-items";
import { t } from "@/i18n/messages";
import { formatChestChance } from "@/lib/chest-chance";

/** The chests of the component's range and its chance from each. */
export function ItemComponentChests({
  component,
}: {
  component: ComponentInfo;
}) {
  const itemsById = useSocketItems();

  // The chests that give the most of the component on average come first.
  const chests = orderBy(
    tierChests(component.tier).map((chest) => ({
      chest,
      chance:
        chestComponents(chest).find(
          ({ element }) => element === component.element,
        )?.chance ?? 0,
    })),
    [({ chest, chance }) => chance * chest.components],
    ["desc"],
  );

  return (
    <ArticleSection
      id="item-component-chests"
      title={t("socket.chests.drops")}
      count={chests.length}
      description={t("socket.chests.dropsDescription")}
    >
      <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {chests.map(({ chest, chance }) => (
          <li key={chest.id}>
            <SocketItem
              item={itemsById.get(chest.id)}
              detail={formatChestChance(chest, chance)}
            />
          </li>
        ))}
      </ul>
    </ArticleSection>
  );
}
