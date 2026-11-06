import { EventEditSkeleton } from "./event-edit-skeleton";
import { EventEditScoringForm } from "./event-edit-scoring-form";
import { EventLoadError } from "./components/event-load-error";
import { useEventEditRoute } from "./hooks/queries/use-event-edit-route";

export const EventEditScoringPage = () => {
  const { event, error, isLoading, refetch, routeParams } = useEventEditRoute();

  if (isLoading) {
    return <EventEditSkeleton />;
  }

  if (error || !event) {
    return (
      <EventLoadError
        backTo="event"
        guildId={routeParams.guildId}
        eventId={routeParams.eventId}
        error={error}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <EventEditScoringForm
      key={`${event.id}:${event.updatedAt}:${event.scoringMode}`}
      event={event}
      routeParams={routeParams}
    />
  );
};
