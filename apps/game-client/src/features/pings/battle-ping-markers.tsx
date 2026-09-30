import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { highlightQuickFightButton } from "./battle-controls";
import { BattlePingMarker } from "./battle-ping-marker";
import { battlePingStore } from "./battle-ping-store";
import { getBattleWarriorElement } from "./battle-warriors";
import {
  BATTLE_QUICK_FIGHT_TYPE,
  PING_TONES,
  getPingPresentation,
} from "./ping-presentation";
import { useAnimationEffects } from "@/hooks/use-animation-effects";

/** Portals each warrior's battle pings into that warrior's game element. */
export const BattlePingMarkers = () => {
  const { highlightedWarriorId, marks, target } = useSyncExternalStore(
    battlePingStore.subscribe,
    battlePingStore.getSnapshot,
  );

  const pulse = useAnimationEffects();

  const quickFightCalled = [...marks.values()].some(
    (mark) => mark.type === BATTLE_QUICK_FIGHT_TYPE,
  );

  // A quick-fight call also lights the button the team should press.
  useEffect(() => {
    if (!quickFightCalled) return;

    const { tone } = getPingPresentation(BATTLE_QUICK_FIGHT_TYPE);

    return highlightQuickFightButton(PING_TONES[tone].glow, pulse);
  }, [pulse, quickFightCalled]);

  const warriorIds = new Set(marks.keys());

  if (target) {
    warriorIds.add(target.warriorId);
  }

  if (highlightedWarriorId !== null) {
    warriorIds.add(highlightedWarriorId);
  }

  return [...warriorIds].map((warriorId) => {
    const element = getBattleWarriorElement(warriorId);

    if (!element) {
      return null;
    }

    return createPortal(
      <BattlePingMarker
        element={element}
        highlighted={highlightedWarriorId === warriorId}
        mark={marks.get(warriorId)}
        target={target?.warriorId === warriorId ? target : undefined}
      />,
      element,
      String(warriorId),
    );
  });
};
