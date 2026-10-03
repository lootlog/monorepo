import type { WindowStatus } from "../types/api";

export const getWindowStatusConfig = (
  status: WindowStatus,
  t: (key: string) => string,
) => {
  switch (status) {
    case "OPEN":
      return {
        label: t("events.respawn.status.open"),
        variant: "ready" as const,
      };
    case "WAITING":
      return {
        label: t("events.respawn.status.waiting"),
        variant: "timer" as const,
      };
    case "OVERDUE":
      return {
        label: t("events.respawn.status.overdue"),
        variant: "alert" as const,
      };
    case "NONE":
    default:
      return {
        label: t("events.respawn.status.none"),
        variant: "secondary" as const,
      };
  }
};
