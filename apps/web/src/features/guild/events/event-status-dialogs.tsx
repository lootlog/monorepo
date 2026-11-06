import { toast } from "@lootlog/ui/components/sonner";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import type { useEventHeader } from "./use-event-header";

type Props = Pick<
  ReturnType<typeof useEventHeader>,
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
> & { event: NonNullable<ReturnType<typeof useEventHeader>["event"]> };

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
    <ConfirmDialog
      open={endDialogOpen}
      onOpenChange={setEndDialogOpen}
      title={t("events.endDialog.title")}
      description={t("events.endDialog.description", { name: event.name })}
      confirmButtonLabel={t("events.end")}
      cancelButtonLabel={t("common.cancel")}
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
    />
    <ConfirmDialog
      open={resumeDialogOpen}
      onOpenChange={setResumeDialogOpen}
      variant="default"
      title={t("events.resumeDialog.title")}
      description={t("events.resumeDialog.description", { name: event.name })}
      confirmButtonLabel={t("events.resume")}
      cancelButtonLabel={t("common.cancel")}
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
    />
    <ConfirmDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      title={t("events.deleteDialog.title")}
      description={t("events.deleteDialog.description", { name: event.name })}
      confirmText={event.name}
      confirmLabel={t("events.deleteDialog.confirmHint", { name: event.name })}
      confirmButtonLabel={t("events.delete")}
      cancelButtonLabel={t("common.cancel")}
      onConfirm={async () => {
        try {
          await deleteEvent.mutateAsync({
            pathParams: {
              guildId: queryGuildId,
              eventId: queryEventId,
            },
          });
          toast.success(t("events.deleteSuccess"));
          navigate({
            to: "/$guildId/events",
            params: { guildId: queryGuildId },
          });
        } catch (error) {
          toast.error(t("events.deleteError"));
          throw error;
        }
      }}
    />
  </>
);
