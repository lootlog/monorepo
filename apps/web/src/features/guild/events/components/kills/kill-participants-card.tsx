import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { useEventsRankingControllerUpdateKillPoint } from "@lootlog/api-client/react-query/main/events";
import type { KillDetailParticipant } from "../../hooks/queries/use-kill-detail";
import { invalidateKillQueries } from "../../hooks/mutations/invalidate-kill-queries";
import { KillParticipantRow } from "./kill-participant-row";

interface KillParticipantsCardProps {
  participants: KillDetailParticipant[];
  guildId?: string;
  eventId?: string;
  killId?: string;
  canEdit?: boolean;
}

export const KillParticipantsCard = ({
  participants,
  guildId,
  eventId,
  killId,
  canEdit = false,
}: KillParticipantsCardProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const updateKillPoint = useEventsRankingControllerUpdateKillPoint({
    mutation: {
      onSuccess: () => {
        if (guildId && eventId) {
          invalidateKillQueries(queryClient, guildId, eventId);
        }
      },
    },
  });
  const sortedParticipants = [...participants].sort(
    (leftParticipant, rightParticipant) =>
      rightParticipant.points - leftParticipant.points,
  );

  const toggleExpanded = (participantId: string) => {
    setExpandedIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(participantId)) {
        nextIds.delete(participantId);
      } else {
        nextIds.add(participantId);
      }
      return nextIds;
    });
  };

  const handleEditPoints = async (
    killPointId: string,
    pointsDelta: number,
    comment?: string,
  ) => {
    if (!killId) return;

    try {
      await updateKillPoint.mutateAsync({
        pathParams: {
          guildId: guildId ?? "",
          eventId: eventId ?? "",
          killId,
          killPointId,
        },
        data: {
          pointsDelta,
          ...(comment ? { comment } : {}),
        },
      });
      toast.success(t("events.points.editSuccess"));
    } catch (error) {
      toast.error(t("events.points.editError"));
      throw error;
    }
  };

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 px-3 py-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <Users className="size-4 shrink-0 text-primary" />
          <h2 className="truncate text-sm font-semibold">
            {t("events.killDetail.participants")}
          </h2>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {t("events.kills.participantCount", {
            count: sortedParticipants.length,
          })}
        </span>
      </div>

      {sortedParticipants.length === 0 ? (
        <div className="border-t border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
          {t("events.kills.noParticipants")}
        </div>
      ) : (
        <>
          <div className="hidden h-9 grid-cols-[2rem_minmax(0,1fr)_7rem_5rem_6.5rem_5rem] items-center gap-2 border-y border-border/70 bg-secondary/25 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground lg:grid">
            <span className="text-center">#</span>
            <span>{t("events.ranking.player")}</span>
            <span className="text-right">{t("events.ranking.time")}</span>
            <span className="text-right">{t("events.kills.afkTime")}</span>
            <span className="text-right">{t("events.ranking.points")}</span>
            <span className="sr-only">{t("events.ranking.actions")}</span>
          </div>
          <div className="border-t border-border/70 lg:border-t-0">
            {sortedParticipants.map((participant, index) => (
              <KillParticipantRow
                key={participant.id}
                participant={participant}
                rank={index + 1}
                isExpanded={expandedIds.has(participant.id)}
                onToggle={() => toggleExpanded(participant.id)}
                guildId={guildId}
                eventId={eventId}
                canEdit={canEdit}
                onEditPoints={handleEditPoints}
                isEditPending={updateKillPoint.isPending}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};
