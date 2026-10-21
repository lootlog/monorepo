import { BandSection } from "@/components/common/band-section";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { useEventsRankingControllerUpdateKillPoint } from "@lootlog/client/main";
import type { KillDetailParticipant } from "../../hooks/queries/use-kill-detail";
import { invalidateKillQueries } from "../../hooks/mutations/invalidate-kill-queries";
import type { KillParticipantScoring } from "../../utils/scoring-applied-rules";
import { KillParticipantRow } from "./kill-participant-row";

interface KillParticipantsCardProps {
  participants: KillDetailParticipant[];
  scoring?: KillParticipantScoring | null;
  guildId?: string;
  eventId?: string;
  killId?: string;
  canEdit?: boolean;
}

export const KillParticipantsCard = ({
  participants,
  scoring = null,
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

  const participantNames = new Map(
    participants.map((participant) => [
      participant.memberId,
      participant.member.name,
    ]),
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
      const data: Parameters<typeof updateKillPoint.mutateAsync>[0]["data"] = {
        pointsDelta,
      };

      if (comment) data.comment = comment;
      await updateKillPoint.mutateAsync({
        pathParams: {
          guildId: guildId ?? "",
          eventId: eventId ?? "",
          killId,
          killPointId,
        },
        data,
      });
      toast.success(t("events.points.editSuccess"));
    } catch (error) {
      toast.error(t("events.points.editError"));
      throw error;
    }
  };

  return (
    <BandSection
      id="kill-participants"
      title={t("events.killDetail.participants")}
      count={sortedParticipants.length}
      tiled
    >
      {sortedParticipants.length === 0 ? (
        <EmptyState
          compact
          icon={Users}
          title={t("events.kills.noParticipants")}
        />
      ) : (
        <>
          <div className="hidden h-10 grid-cols-[2rem_minmax(0,1fr)_7rem_5rem_6.5rem_5rem] items-center gap-2 border-b border-sidebar-border bg-sidebar px-3 text-xs font-semibold text-muted-foreground lg:grid">
            <span className="text-center">#</span>
            <span>{t("events.ranking.player")}</span>
            <span className="text-right">{t("events.ranking.time")}</span>
            <span className="text-right">{t("events.kills.afkTime")}</span>
            <span className="text-right">{t("events.ranking.points")}</span>
            <span className="sr-only">{t("events.ranking.actions")}</span>
          </div>
          <div>
            {sortedParticipants.map((participant, index) => (
              <KillParticipantRow
                key={participant.id}
                participant={participant}
                scoring={scoring}
                participantNames={participantNames}
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
    </BandSection>
  );
};
