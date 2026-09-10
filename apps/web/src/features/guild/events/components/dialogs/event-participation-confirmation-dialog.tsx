import { EventParticipationConfirmationDialogContent } from "./event-participation-confirmation-dialog-content";

interface EventParticipationConfirmationDialogProps {
  guildId?: string;
  eventId?: string;
}

export const EventParticipationConfirmationDialog = ({
  guildId,
  eventId,
}: EventParticipationConfirmationDialogProps) => {
  if (!guildId || !eventId) {
    return null;
  }

  return (
    <EventParticipationConfirmationDialogContent
      key={`${guildId}:${eventId}`}
      guildId={guildId}
      eventId={eventId}
    />
  );
};
