import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import { NpcTile } from "@/components/tiles";
import { Button } from "@lootlog/ui/components/button";
import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Spinner } from "@lootlog/ui/components/spinner";
import { formatDistanceToNowStrict } from "date-fns";
import { pl } from "date-fns/locale";
import { AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { useParticipationConfirmation } from "./use-participation-confirmation";

interface EventParticipationConfirmationDialogProps {
  guildId?: string;
  eventId?: string;
}

export const EventParticipationConfirmationDialogContent = ({
  guildId,
  eventId,
}: Required<EventParticipationConfirmationDialogProps>) => {
  const {
    open,
    handleOpenChange,
    t,
    isLoading,
    sortedItems,
    isConfirmingAll,
    confirmingKillIds,
    confirmParticipation,
    handleConfirm,
    handleConfirmAll,
    sortedExpiredItems,
  } = useParticipationConfirmation({ guildId, eventId });

  if (!open) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen, eventDetails) => {
        if (!nextOpen && eventDetails.reason === "outside-press") {
          eventDetails.cancel();

          return;
        }

        handleOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
        <IconDialogHeader
          icon={ShieldCheck}
          title={t("events.confirmation.title")}
          description={t("events.confirmation.description")}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Spinner className="size-4" />
          </div>
        ) : (
          <div className="p-5">
            {sortedItems.length > 0 && (
              <>
                <ScrollArea className="max-h-[320px] pr-2">
                  <div className="space-y-2">
                    {sortedItems.map((item) => {
                      const deadline = new Date(item.confirmationDeadlineAt);

                      const remaining = formatDistanceToNowStrict(deadline, {
                        addSuffix: true,
                        locale: pl,
                      });

                      return (
                        <div
                          key={item.killId}
                          className="border-b border-border/70 px-3 py-2.5 last:border-b-0"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {item.heroNpc.npcIcon ? (
                                <NpcTile
                                  npc={{
                                    id: undefined,
                                    name: item.heroNpc.npcName,
                                    icon: item.heroNpc.npcIcon,
                                  }}
                                />
                              ) : null}
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">
                                  {item.heroNpc.npcName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {timestampToDate(item.killedAt)}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {t("events.confirmation.deadline")}:{" "}
                                  {timestampToDate(deadline)} ({remaining})
                                </p>
                              </div>
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                isConfirmingAll ||
                                confirmingKillIds.size > 0 ||
                                confirmParticipation.isPending
                              }
                              loading={confirmingKillIds.has(item.killId)}
                              onClick={() => handleConfirm(item.killId)}
                            >
                              {t("events.confirmation.confirm")}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    loading={isConfirmingAll}
                    onClick={handleConfirmAll}
                    disabled={
                      isConfirmingAll ||
                      confirmingKillIds.size > 0 ||
                      confirmParticipation.isPending
                    }
                  >
                    {t("events.confirmation.confirmAll")}
                  </Button>
                </div>
              </>
            )}

            {sortedExpiredItems.length > 0 && (
              <div className={sortedItems.length > 0 ? "mt-4" : undefined}>
                <div className="mb-2 flex items-center gap-2 text-signal-timer">
                  <AlertTriangle className="size-4" />
                  <p className="text-sm font-semibold">
                    {t("events.confirmation.expiredTitle")}
                  </p>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  {t("events.confirmation.expiredDescription")}
                </p>

                <ScrollArea className="max-h-[180px] pr-2">
                  <div className="space-y-2">
                    {sortedExpiredItems.map((item) => {
                      const deadline = new Date(item.confirmationDeadlineAt);

                      return (
                        <div
                          key={item.killId}
                          className="rounded-lg border border-signal-timer/30 bg-signal-timer/5 px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {item.heroNpc.npcIcon ? (
                              <NpcTile
                                npc={{
                                  id: undefined,
                                  name: item.heroNpc.npcName,
                                  icon: item.heroNpc.npcIcon,
                                }}
                              />
                            ) : null}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">
                                {item.heroNpc.npcName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {timestampToDate(item.killedAt)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t("events.confirmation.deadline")}:{" "}
                                {timestampToDate(deadline)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
