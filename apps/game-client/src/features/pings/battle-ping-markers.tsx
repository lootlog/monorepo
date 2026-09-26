import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { BattlePingMarker } from "./battle-ping-marker";
import { battlePingStore } from "./battle-ping-store";
import { getBattleWarriorElement } from "./battle-warriors";

/** Portals each warrior's battle pings into that warrior's game element. */
export const BattlePingMarkers = () => {
  const { marks, target } = useSyncExternalStore(
    battlePingStore.subscribe,
    battlePingStore.getSnapshot,
  );

  const warriorIds = new Set(marks.keys());

  if (target) {
    warriorIds.add(target.warriorId);
  }

  return [...warriorIds].map((warriorId) => {
    const element = getBattleWarriorElement(warriorId);

    if (!element) {
      return null;
    }

    return createPortal(
      <BattlePingMarker
        mark={marks.get(warriorId)}
        target={target?.warriorId === warriorId ? target : undefined}
      />,
      element,
      String(warriorId),
    );
  });
};
