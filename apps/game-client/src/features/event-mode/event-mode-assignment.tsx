import type { EventModeResponseDtoEventsItemAssignmentsItem } from "@/lib/api/generated/main/model/event-mode-response-dto-events-item-assignments-item";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  getAssignmentPresence,
  getPrimaryAssignment,
  type EventModeAssignmentPresence,
} from "./event-mode.helpers";

interface EventModeAssignmentProps {
  assignments: EventModeResponseDtoEventsItemAssignmentsItem[];
  currentMapId: number;
}

export const EventModeAssignment = ({
  assignments,
  currentMapId,
}: EventModeAssignmentProps) => {
  const { t } = useTranslation("eventMode");
  const primaryAssignment = getPrimaryAssignment(assignments, currentMapId);
  const presence = getAssignmentPresence(assignments, currentMapId);
  const additionalAssignmentCount = Math.max(0, assignments.length - 1);

  return (
    <section
      aria-label={t("assignment.title")}
      className="ll:rounded-md ll:border ll:border-white/10 ll:bg-black/25 ll:px-2 ll:py-1.5"
    >
      <div className="ll:mb-1 ll:flex ll:items-center ll:justify-between ll:gap-2">
        <div className="ll:flex ll:items-center ll:gap-1 ll:text-[9px] ll:font-semibold ll:uppercase ll:tracking-[0.12em] ll:text-amber-200/70">
          <MapPin size={10} aria-hidden="true" />
          <span>{t("assignment.title")}</span>
        </div>
        <span
          className={getPresenceClassName(presence)}
          data-testid="event-mode-presence"
        >
          {t(`assignment.presence.${presence}`)}
        </span>
      </div>
      {primaryAssignment ? (
        <div className="ll:flex ll:min-w-0 ll:items-center ll:justify-between ll:gap-2">
          <div className="ll:min-w-0">
            <p className="ll:truncate ll:text-[12px] ll:font-semibold ll:text-gray-100">
              {primaryAssignment.npcName}
            </p>
            <p className="ll:truncate ll:text-[10px] ll:text-gray-400">
              {primaryAssignment.mapName}
            </p>
          </div>
          {additionalAssignmentCount > 0 ? (
            <span
              className="ll:shrink-0 ll:rounded ll:border ll:border-amber-300/25 ll:bg-amber-300/10 ll:px-1.5 ll:py-0.5 ll:text-[9px] ll:font-semibold ll:text-amber-200"
              aria-label={t("assignment.additionalLabel", {
                count: additionalAssignmentCount,
              })}
            >
              {t("assignment.additional", {
                count: additionalAssignmentCount,
              })}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="ll:text-[11px] ll:text-gray-400">
          {t("assignment.empty")}
        </p>
      )}
    </section>
  );
};

function getPresenceClassName(presence: EventModeAssignmentPresence) {
  const baseClassName =
    "ll:rounded-full ll:border ll:px-1.5 ll:py-0.5 ll:text-[9px] ll:font-semibold";

  if (presence === "on-map") {
    return `${baseClassName} ll:border-emerald-400/30 ll:bg-emerald-400/10 ll:text-emerald-300`;
  }

  if (presence === "off-map") {
    return `${baseClassName} ll:border-orange-400/30 ll:bg-orange-400/10 ll:text-orange-300`;
  }

  return `${baseClassName} ll:border-gray-400/25 ll:bg-white/5 ll:text-gray-400`;
}
