import type { WindowStatus } from "../types/api";

export const getWindowStatusConfig = (
  status: WindowStatus,
  t: (key: string) => string,
) => {
  switch (status) {
    case "OPEN":
      return {
        label: t("events.respawn.status.open"),
        className: "bg-green-500/10 text-green-500 border-green-500/20",
      };
    case "WAITING":
      return {
        label: t("events.respawn.status.waiting"),
        className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      };
    case "OVERDUE":
      return {
        label: t("events.respawn.status.overdue"),
        className: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      };
    case "NONE":
    default:
      return {
        label: t("events.respawn.status.none"),
        className: "bg-muted text-muted-foreground border-border",
      };
  }
};
