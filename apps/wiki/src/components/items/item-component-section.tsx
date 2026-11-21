import {
  type ComponentInfo,
  SOCKET_BONUSES,
  symbolRecipe,
} from "@lootlog/domain/item-socket";
import { ArticleSection } from "@/components/article/article-section";
import { SocketItem } from "@/components/sockets/socket-item";
import { useSocketItems } from "@/hooks/use-socket-items";
import { t } from "@/i18n/messages";

/** The symbols of the component's range whose fusion takes it, and how many. */
export function ItemComponentSection({
  component,
}: {
  component: ComponentInfo;
}) {
  const itemsById = useSocketItems();
  const { tier, element } = component;

  const uses = SOCKET_BONUSES.flatMap((bonus) => {
    const count = symbolRecipe(tier, bonus).find(
      (needed) => needed.element === element,
    )?.count;

    return count ? [{ symbolId: tier.symbols[bonus], count }] : [];
  });

  return (
    <ArticleSection
      id="item-component-uses"
      title={t("socket.usedIn")}
      count={uses.length}
      description={t("socket.usedInDescription")}
    >
      <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {uses.map(({ symbolId, count }) => (
          <li key={symbolId}>
            <SocketItem
              item={itemsById.get(symbolId)}
              detail={t("socket.count", { count })}
            />
          </li>
        ))}
      </ul>
    </ArticleSection>
  );
}
