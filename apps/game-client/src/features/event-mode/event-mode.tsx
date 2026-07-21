import { DraggableWindow } from "@/components/draggable-window";
import { Game } from "@/lib/game";
import {
  createEventModeSelectionScope,
  useEventModeSelectionStore,
} from "@/store/event-mode-selection.store";
import { useWindowsStore } from "@/store/windows.store";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { EventModeContent } from "./event-mode-content";
import { resolveSelectedEvent } from "./event-mode.helpers";
import { EventModeSelector } from "./event-mode-selector";
import { useEventModeClock } from "./use-event-mode-clock";
import type { useEventModeQuery } from "./use-event-mode-query";

interface EventModeProps {
  query: ReturnType<typeof useEventModeQuery>;
}

export const EventMode = ({ query }: EventModeProps) => {
  const { t } = useTranslation("eventMode");
  const open = useWindowsStore((state) => state["event-mode"].open);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const events = query.data?.events ?? [];
  const selectionScope = query.enabled
    ? createEventModeSelectionScope(
        query.margonemAccountId,
        query.normalizedWorld,
      )
    : null;
  const storedEventId = useEventModeSelectionStore((state) =>
    selectionScope ? state.selectedEventIdByScope[selectionScope] : undefined,
  );
  const setSelectedEventId = useEventModeSelectionStore(
    (state) => state.setSelectedEventId,
  );
  const selectedEvent = resolveSelectedEvent(events, storedEventId);
  const nowMs = useEventModeClock(open && events.length > 0);

  useEffect(() => {
    if (
      !selectionScope ||
      !selectedEvent ||
      storedEventId === selectedEvent.id
    ) {
      return;
    }

    setSelectedEventId(selectionScope, selectedEvent.id);
  }, [selectedEvent, selectionScope, setSelectedEventId, storedEventId]);

  if (!query.data || !selectedEvent) {
    return null;
  }

  const currentMapId = Number(Game.map.id);
  const isStale = query.isError && query.data !== undefined;

  return (
    <DraggableWindow
      isOpen={open}
      id="event-mode"
      title={t("window.title")}
      actions=<EventModeSelector
        events={events}
        selectedEventId={selectedEvent.id}
        isStale={isStale}
        lastUpdatedAt={query.dataUpdatedAt}
        onEventChange={(eventId) => {
          if (selectionScope) {
            setSelectedEventId(selectionScope, eventId);
          }
        }}
      />
      variant="small"
      resizable={false}
      minWidth={290}
      minHeight={132}
      dynamicHeight
      onClose={() => setOpen("event-mode", false)}
      closable
    >
      <EventModeContent
        event={selectedEvent}
        currentMapId={currentMapId}
        nowMs={nowMs}
      />
    </DraggableWindow>
  );
};
