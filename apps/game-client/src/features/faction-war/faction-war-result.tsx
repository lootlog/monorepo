import { useState, type FC } from "react";
import { flagFactionWar } from "./faction-war-pick-state";
import { useSeenFactionWarResults } from "./faction-war-preferences";
import { shouldShowFactionWarResult } from "./faction-war-result-state";
import { FactionWarResultScreen } from "./faction-war-result-screen";
import { useCurrentFactionWar } from "./use-current-faction-war";

/**
 * Shows how the war ended once, when the game starts after it ended and
 * this browser has not shown its result yet. The choice is made for the
 * first war the session sees, so a later refetch never covers the game
 * during play.
 */
export const FactionWarResult: FC = () => {
  const { data: war } = useCurrentFactionWar();
  const [seen, setSeen] = useSeenFactionWarResults();

  const [decision, setDecision] = useState<"pending" | "show" | "skip">(
    "pending",
  );

  if (decision === "pending" && war) {
    setDecision(shouldShowFactionWarResult(war, seen) ? "show" : "skip");
  }

  if (decision !== "show" || war?.status !== "ENDED") return null;

  return (
    <FactionWarResultScreen
      war={war}
      onClose={() => {
        setSeen(flagFactionWar(seen, war.id));
        setDecision("skip");
      }}
    />
  );
};
