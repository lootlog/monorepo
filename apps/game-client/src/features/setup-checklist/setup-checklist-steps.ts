import type { RealtimeConnectionStatus } from "@/lib/realtime-connection-status";

export type SetupStepId = "sign-in" | "join-lootlog" | "catching" | "realtime";

/**
 * - `done`: nothing left to do.
 * - `todo`: the player has to act; the step offers its one action.
 * - `pending`: still being checked, so neither done nor missing yet.
 * - `blocked`: waits for an earlier step.
 */
export type SetupStepStatus = "done" | "todo" | "pending" | "blocked";

export type SetupStep = { id: SetupStepId; status: SetupStepStatus };

type SetupChecklistInput = {
  /** `undefined` while the session is still being checked. */
  signedIn: boolean | undefined;
  /** The player's Lootlogs; `undefined` until the list loads. */
  guildIds: readonly string[] | undefined;
  /** This character's catching scope; `undefined` until its config loads. */
  catchingGuildIds: readonly string[] | undefined;
  realtimeStatus: RealtimeConnectionStatus;
};

export type SetupChecklist = {
  steps: SetupStep[];
  /** Steps that are not done yet, out of `steps.length`. */
  remaining: number;
  /**
   * A setup step is known to be missing. Checks still in flight never count,
   * so the checklist does not flash in while the client starts. The realtime
   * connection is transient rather than setup: a dropped connection shows on
   * its step and in the connection status, but does not reopen the checklist
   * for a player who finished setting up.
   */
  incomplete: boolean;
};

const getRealtimeStatus = (
  status: RealtimeConnectionStatus,
): SetupStepStatus => {
  if (status === "online") return "done";

  if (status === "connecting") return "pending";

  return "todo";
};

/** First-run setup of one character, each step gated on the one before. */
export const getSetupChecklist = ({
  signedIn,
  guildIds,
  catchingGuildIds,
  realtimeStatus,
}: SetupChecklistInput): SetupChecklist => {
  let signIn: SetupStepStatus = "pending";

  if (signedIn !== undefined) signIn = signedIn ? "done" : "todo";

  let join: SetupStepStatus = "blocked";

  if (signIn === "done") {
    if (!guildIds) join = "pending";
    else join = guildIds.length > 0 ? "done" : "todo";
  }

  let catching: SetupStepStatus = "blocked";

  if (join === "done") {
    if (!catchingGuildIds) catching = "pending";
    // A Lootlog the player has left no longer receives their data.
    else
      catching = catchingGuildIds.some((id) => guildIds?.includes(id))
        ? "done"
        : "todo";
  }

  // The gateway joins a session only for a member of some Lootlog.
  const realtime: SetupStepStatus =
    join === "done" ? getRealtimeStatus(realtimeStatus) : "blocked";

  const steps: SetupStep[] = [
    { id: "sign-in", status: signIn },
    { id: "join-lootlog", status: join },
    { id: "catching", status: catching },
    { id: "realtime", status: realtime },
  ];

  return {
    steps,
    remaining: steps.filter((step) => step.status !== "done").length,
    incomplete: [signIn, join, catching].includes("todo"),
  };
};
