import { NpcTile } from "@/components/tiles";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Spinner } from "@lootlog/ui/components/spinner";
import { formatDistanceToNowStrict } from "date-fns";
import { pl } from "date-fns/locale";
import { AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import { formatDateTime } from "../../utils/format-date";
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
      <DialogContent className="sm:max-w-xl p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            {t("events.confirmation.title", "Potwierdź udział")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "events.confirmation.description",
              "Potwierdź udział w obstawianiu, aby naliczyć punkty za te bicia.",
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Spinner className="size-4" />
          </div>
        ) : (
          <>
            {sortedItems.length > 0 && (
              <>
                <ScrollArea className="max-h-[320px] pr-2 py-4">
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
                                  {formatDateTime(new Date(item.killedAt))}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {t(
                                    "events.confirmation.deadline",
                                    "Do",
                                  )}:{" "}
                                  {formatDateTime(deadline)} ({remaining})
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
                              {t("events.confirmation.confirm", "Potwierdź")}
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
                    {t("events.confirmation.confirmAll", "Potwierdź wszystko")}
                  </Button>
                </div>
              </>
            )}

            {sortedExpiredItems.length > 0 && (
              <div className={sortedItems.length > 0 ? "mt-4" : undefined}>
                <div className="mb-2 flex items-center gap-2 text-amber-500">
                  <AlertTriangle className="size-4" />
                  <p className="text-sm font-semibold">
                    {t(
                      "events.confirmation.expiredTitle",
                      "Przeterminowane potwierdzenia",
                    )}
                  </p>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  {t(
                    "events.confirmation.expiredDescription",
                    "Dla tych bić nie potwierdzono udziału na czas, więc punkty nie zostały naliczone.",
                  )}
                </p>

                <ScrollArea className="max-h-[180px] pr-2">
                  <div className="space-y-2">
                    {sortedExpiredItems.map((item) => {
                      const deadline = new Date(item.confirmationDeadlineAt);

                      return (
                        <div
                          key={item.killId}
                          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5"
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
                                {formatDateTime(new Date(item.killedAt))}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t("events.confirmation.deadline", "Do")}:{" "}
                                {formatDateTime(deadline)}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
