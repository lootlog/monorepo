import { useEffect, useRef, type FC } from "react";
import {
  dismissFactionWarPick,
  shouldAutoOpenFactionWarPick,
} from "./faction-war-pick-state";
import { useFactionWarPickStore } from "./faction-war-pick.store";
import { FactionWarPickScreen } from "./faction-war-pick-screen";
import { useDismissedFactionWarPicks } from "./faction-war-preferences";
import { useCurrentFactionWar } from "./use-current-faction-war";

/**
 * Opens the pick screen by itself once, when the game starts during a war
 * the player has neither picked in nor put away. The quick access bar opens
 * it again while a pick is still possible.
 */
export const FactionWarPick: FC = () => {
  const { data: war } = useCurrentFactionWar();
  const open = useFactionWarPickStore((state) => state.open);
  const setOpen = useFactionWarPickStore((state) => state.setOpen);
  const [dismissed, setDismissed] = useDismissedFactionWarPicks();
  const decidedRef = useRef(false);

  useEffect(() => {
    if (decidedRef.current || !war) return;

    decidedRef.current = true;

    if (shouldAutoOpenFactionWarPick(war, dismissed)) setOpen(true);
  }, [dismissed, setOpen, war]);

  if (!open || !war) return null;

  return (
    <FactionWarPickScreen
      war={war}
      onDismiss={() => {
        setDismissed(dismissFactionWarPick(dismissed, war.id));
        setOpen(false);
      }}
      onClose={() => setOpen(false)}
    />
  );
};
