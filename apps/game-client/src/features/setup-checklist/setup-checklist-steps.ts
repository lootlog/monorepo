import { intersection } from "es-toolkit";
import type { RealtimeConnectionStatus } from "@/lib/realtime-connection-status";

export type SetupStepId = "sign-in" | "join-lootlog" | "catching" | "realtime";

type SetupStepStatus = "done" | "todo" | "pending" | "blocked";

export type SetupStep = { id: SetupStepId; status: SetupStepStatus };

type SetupChecklistInput = {
  signedIn: boolean | undefined;
  guildIds: readonly string[] | undefined;
  catchingGuildIds: readonly string[] | undefined;
  realtimeStatus: RealtimeConnectionStatus;
};

export type SetupChecklist = {
  steps: SetupStep[];
  remaining: number;
  incomplete: boolean;
};

const getRealtimeStatus = (
  status: RealtimeConnectionStatus,
): SetupStepStatus => {
  if (status === "online") return "done";

  if (status === "connecting") return "pending";

  return "todo";
};

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
    else
      catching =
        intersection(catchingGuildIds, guildIds ?? []).length > 0
          ? "done"
          : "todo";
  }

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
