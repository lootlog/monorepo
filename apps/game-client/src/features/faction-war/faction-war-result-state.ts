import type { FactionWarResponseDto } from "@lootlog/client/main";
import type { FactionWarFaction } from "@lootlog/domain/faction-war";
import type { FactionWarFlags } from "./faction-war-pick-state";

export type FactionWarOutcome =
  | { kind: "winner"; faction: FactionWarFaction }
  | { kind: "tie" }
  | { kind: "none" };

/**
 * How the war ended, from the server's winners: one faction with the most
 * points, both on equal points, or nobody when no faction scored.
 */
export const getFactionWarOutcome = (
  war: Pick<FactionWarResponseDto, "winners">,
): FactionWarOutcome => {
  const [first, ...rest] = war.winners;

  if (!first) return { kind: "none" };

  return rest.length === 0
    ? { kind: "winner", faction: first }
    : { kind: "tie" };
};

/** The result opens by itself once per ended war on this browser. */
export const shouldShowFactionWarResult = (
  war: Pick<FactionWarResponseDto, "id" | "status"> | null | undefined,
  seen: FactionWarFlags,
): war is Pick<FactionWarResponseDto, "id" | "status"> =>
  war?.status === "ENDED" && !seen[war.id];
