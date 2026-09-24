import {
  useContext,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  LootItemStackLootIdContext,
  LootListItemStacksContext,
  type ExpandedLootItemStack,
} from "./loot-item-stack-context";

export const useItemStackExpansion = (
  playerId: ExpandedLootItemStack["playerId"],
) => {
  const lootId = useContext(LootItemStackLootIdContext);

  const [expandedStacks = [], setExpandedStacks] =
    useContext(LootListItemStacksContext) ?? [];

  const [localAnchorRect, setLocalAnchorRect] = useState<DOMRect | null>(null);
  const stackRef = useRef<HTMLDivElement>(null);

  const anchorRect =
    lootId !== null && setExpandedStacks
      ? (expandedStacks.find(
          (stack) => stack.lootId === lootId && stack.playerId === playerId,
        )?.anchorRect ?? null)
      : localAnchorRect;

  const isExpanded = anchorRect !== null;

  const setExpansion = (nextAnchorRect: DOMRect | null) => {
    if (lootId !== null && setExpandedStacks) {
      setExpandedStacks((stacks) => {
        const remaining = stacks.filter(
          (stack) => stack.lootId !== lootId || stack.playerId !== playerId,
        );

        return nextAnchorRect
          ? [...remaining, { lootId, playerId, anchorRect: nextAnchorRect }]
          : remaining;
      });
    } else {
      setLocalAnchorRect(nextAnchorRect);
    }
  };

  const closeStack = useEffectEvent(() => setExpansion(null));

  // Grid regrouping can remount the card while its expanded stack stays open.
  useLayoutEffect(() => {
    if (!anchorRect) return;
    const currentRect = stackRef.current?.getBoundingClientRect();

    if (
      currentRect &&
      (currentRect.x !== anchorRect.x ||
        currentRect.y !== anchorRect.y ||
        currentRect.width !== anchorRect.width ||
        currentRect.height !== anchorRect.height)
    ) {
      setExpansion(currentRect);
    }
  });

  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: PointerEvent) => {
      if (
        stackRef.current &&
        (!(event.target instanceof Node) ||
          !stackRef.current.contains(event.target))
      ) {
        closeStack();
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);

    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, [isExpanded]);

  return {
    stackRef,
    anchorRect,
    isExpanded,
    toggleExpansion: () =>
      setExpansion(
        isExpanded ? null : (stackRef.current?.getBoundingClientRect() ?? null),
      ),
  };
};
