import type { EventModeResponseDtoEventsItem } from "@lootlog/api-client/models/main/event-mode-response-dto-events-item";
import { EventModeAssignment } from "./event-mode-assignment";
import { EventModeRespawn } from "./event-mode-respawn";

interface EventModeContentProps {
  event: EventModeResponseDtoEventsItem;
  currentMapId: number;
  nowMs: number;
}

export const EventModeContent = ({
  event,
  currentMapId,
  nowMs,
}: EventModeContentProps) => {
  return (
    <div className="ll:flex ll:flex-col ll:gap-1.5 ll:bg-gradient-to-b ll:from-amber-950/10 ll:to-transparent ll:p-2">
      <div className="ll:flex ll:min-w-0 ll:items-center ll:gap-2 ll:px-0.5 ll:pb-0.5">
        <span
          className="ll:h-7 ll:w-0.5 ll:shrink-0 ll:rounded-full ll:bg-amber-300/80 ll:shadow-[0_0_8px_rgba(252,211,77,0.35)]"
          aria-hidden="true"
        />
        <div className="ll:min-w-0">
          <p className="ll:truncate ll:text-[12px] ll:font-semibold ll:text-amber-50">
            {event.name}
          </p>
          <p className="ll:truncate ll:text-[9px] ll:uppercase ll:tracking-[0.08em] ll:text-gray-500">
            {event.guild.name}
          </p>
        </div>
      </div>
      <EventModeAssignment
        assignments={event.assignments}
        currentMapId={currentMapId}
      />
      <EventModeRespawn respawn={event.nextRespawn} nowMs={nowMs} />
    </div>
  );
};
