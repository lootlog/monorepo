import { AnimatedWindow } from "@/components/animated-window";
import { DraggableWindow } from "@/components/draggable-window";
import { Game } from "@/lib/game";
import {
  createEventModeSelectionScope,
  useEventModeSelectionStore,
} from "@/store/event-mode-selection.store";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { EventModeContent } from "./event-mode-content";
import { resolveSelectedEvent } from "./event-mode.helpers";
import { EventModeSelector } from "./event-mode-selector";
import { useEventModeClock } from "./use-event-mode-clock";
import { useEventModeQuery } from "./use-event-mode-query";

export const EventMode = () => {
  const { t } = useTranslation("eventMode");
  const query = useEventModeQuery();
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
  const nowMs = useEventModeClock(events.length > 0);

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
    <AnimatedWindow isOpen windowKey="event-mode">
      <DraggableWindow
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
        closable={false}
      >
        <EventModeContent
          event={selectedEvent}
          currentMapId={currentMapId}
          nowMs={nowMs}
        />
      </DraggableWindow>
    </AnimatedWindow>
  );
};
