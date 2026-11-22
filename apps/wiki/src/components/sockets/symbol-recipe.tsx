import { ArrowRight } from "lucide-react";
import type { RecipeComponent } from "@lootlog/domain/item-socket";
import { useSocketItems } from "@/hooks/use-socket-items";
import { t } from "@/i18n/messages";
import { SocketItem } from "./socket-item";

type SymbolRecipeProps = {
  recipe: ReadonlyArray<RecipeComponent>;
  symbolId?: number;
};

export function SymbolRecipe({ recipe, symbolId }: SymbolRecipeProps) {
  const itemsById = useSocketItems();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <ul
        aria-label={t("socket.recipe")}
        className="flex min-w-0 flex-col gap-2"
      >
        {recipe.map(({ id, count }) => (
          <li key={id}>
            <SocketItem
              item={itemsById.get(id)}
              detail={t("socket.count", { count })}
            />
          </li>
        ))}
      </ul>
      {symbolId === undefined ? null : (
        <>
          <ArrowRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
          <SocketItem item={itemsById.get(symbolId)} />
        </>
      )}
    </div>
  );
}
