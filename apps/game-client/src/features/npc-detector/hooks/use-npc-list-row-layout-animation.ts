import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { GameNpcWithLocation } from "@/store/npc-detector.store";

const supportsElementAnimation = (element: HTMLElement) =>
  typeof element.animate === "function";

type Options = {
  npcs: GameNpcWithLocation[] | undefined;
  startIndex: number;
  endIndex: number;
  animationEffectsEnabled: boolean;
  listContentRef: RefObject<HTMLElement | null>;
  rowStride: number;
};

export function useNpcListRowLayoutAnimation({
  npcs,
  startIndex,
  endIndex,
  animationEffectsEnabled,
  listContentRef,
  rowStride,
}: Options) {
  const [rowLayoutAnimations] = useState(() => new Map<number, Animation>());
  const [initialNpcIndexById] = useState(
    () => new Map((npcs ?? []).map((npc, index) => [npc.id, index])),
  );
  const previousNpcIndexByIdRef = useRef(initialNpcIndexById);
  useLayoutEffect(() => {
    const currentNpcIndexById = new Map(
      (npcs ?? []).map((npc, index) => [npc.id, index]),
    );

    for (const [npcId, animation] of rowLayoutAnimations) {
      if (!animationEffectsEnabled || !currentNpcIndexById.has(npcId)) {
        animation.cancel();
        rowLayoutAnimations.delete(npcId);
      }
    }

    const listContent = listContentRef.current;
    if (animationEffectsEnabled && listContent) {
      (npcs ?? []).slice(startIndex, endIndex).forEach((npc, visibleIndex) => {
        const previousIndex = previousNpcIndexByIdRef.current.get(npc.id);
        const currentIndex = startIndex + visibleIndex;
        if (previousIndex === undefined || previousIndex === currentIndex) {
          return;
        }

        const rowElement = listContent.querySelector<HTMLElement>(
          `[data-ll-npc-row-id="${npc.id}"]`,
        );
        if (!rowElement || !supportsElementAnimation(rowElement)) {
          return;
        }

        rowLayoutAnimations.get(npc.id)?.cancel();
        const translateY = (previousIndex - currentIndex) * rowStride;
        const animation = rowElement.animate(
          [
            { transform: `translateY(${translateY}px)` },
            { transform: "translateY(0)" },
          ],
          {
            duration: 180,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          },
        );
        rowLayoutAnimations.set(npc.id, animation);
        const clearAnimation = () => {
          if (rowLayoutAnimations.get(npc.id) === animation) {
            rowLayoutAnimations.delete(npc.id);
          }
        };
        animation.oncancel = clearAnimation;
        animation.onfinish = clearAnimation;
      });
    }

    previousNpcIndexByIdRef.current = currentNpcIndexById;
  }, [
    animationEffectsEnabled,
    endIndex,
    npcs,
    startIndex,
    listContentRef,
    rowLayoutAnimations,
    rowStride,
  ]);

  useLayoutEffect(
    () => () => {
      rowLayoutAnimations.forEach((animation) => {
        animation.cancel();
      });
      rowLayoutAnimations.clear();
    },
    [rowLayoutAnimations],
  );
}
