import { toast } from "sonner";
import { EventActionDialog } from "./components/dialogs/event-action-dialog";
import type { useEventDetail } from "./use-event-detail";
type Props = Pick<
  ReturnType<typeof useEventDetail>,
  | "endDialogOpen"
  | "setEndDialogOpen"
  | "updateEvent"
  | "queryGuildId"
  | "queryEventId"
  | "t"
  | "resumeDialogOpen"
  | "setResumeDialogOpen"
  | "deleteDialogOpen"
  | "setDeleteDialogOpen"
  | "deleteEvent"
  | "navigate"
> & { event: NonNullable<ReturnType<typeof useEventDetail>["event"]> };
export const EventStatusDialogs = ({
  endDialogOpen,
  setEndDialogOpen,
  event,
  updateEvent,
  queryGuildId,
  queryEventId,
  t,
  resumeDialogOpen,
  setResumeDialogOpen,
  deleteDialogOpen,
  setDeleteDialogOpen,
  deleteEvent,
  navigate,
}: Props) => (
  <>
    <EventActionDialog
      open={endDialogOpen}
      onOpenChange={setEndDialogOpen}
      eventName={event.name}
      titleKey="events.endDialog.title"
      descriptionKey="events.endDialog.description"
      actionLabelKey="events.end"
      variant="destructive"
      onConfirm={async () => {
        try {
          await updateEvent.mutateAsync({
            pathParams: {
              guildId: queryGuildId,
              eventId: queryEventId,
            },
            data: {
              endsAt: new Date().toISOString(),
            },
          });
          toast.success(t("events.endSuccess"));
        } catch (error) {
          toast.error(t("events.statusError"));
          throw error;
        }
      }}
      isPending={updateEvent.isPending}
    />
    <EventActionDialog
      open={resumeDialogOpen}
      onOpenChange={setResumeDialogOpen}
      eventName={event.name}
      titleKey="events.resumeDialog.title"
      descriptionKey="events.resumeDialog.description"
      actionLabelKey="events.resume"
      onConfirm={async () => {
        try {
          await updateEvent.mutateAsync({
            pathParams: {
              guildId: queryGuildId,
              eventId: queryEventId,
            },
            data: {
              endsAt: null,
            },
          });
          toast.success(t("events.resumeSuccess"));
        } catch (error) {
          toast.error(t("events.statusError"));
          throw error;
        }
      }}
      isPending={updateEvent.isPending}
    />
    <EventActionDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      eventName={event.name}
      requireNameConfirmation
      titleKey="events.deleteDialog.title"
      descriptionKey="events.deleteDialog.description"
      actionLabelKey="events.delete"
      variant="destructive"
      isPending={deleteEvent.isPending}
      onConfirm={async () => {
        try {
          await deleteEvent.mutateAsync({
            pathParams: {
              guildId: queryGuildId,
              eventId: queryEventId,
            },
          });
          toast.success(t("events.deleteSuccess"));
          setDeleteDialogOpen(false);
          navigate({
            to: "/$guildId/events",
            params: { guildId: queryGuildId },
          });
        } catch {
          toast.error(t("events.deleteError"));
        }
      }}
    />
  </>
);
