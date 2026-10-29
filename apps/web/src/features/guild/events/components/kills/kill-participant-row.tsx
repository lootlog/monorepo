import { EmptyState } from "@/components/common/empty-state";
import type { TOptions } from "i18next";
import { TextLink } from "@lootlog/ui/components/text-link";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { ChevronDown, Info, MapPin, Pencil } from "lucide-react";
import { cn } from "cn";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { getCustomRoleCssColor } from "@/utils/get-color-from-role";
import { getMemberDisplayRole } from "@lootlog/domain/member-display-role";
import type { KillDetailParticipant } from "../../hooks/queries/use-kill-detail";
import { aggregateMapData } from "../../utils/aggregate-map-data";
import { formatDurationHuman } from "../../utils/format-duration";
import { formatPoints } from "../../utils/format-points";
import {
  getScoringBreakdown,
  getScoringItems,
} from "../../utils/scoring-presentation";
import { ManualPointsEditDialog } from "../dialogs/manual-points-edit-dialog";
import { ScoringBreakdownList } from "../shared/scoring-breakdown-list";
import { ScoringPresenceBreakdown } from "../shared/scoring-presence-breakdown";
import type { KillParticipantScoring } from "../../utils/scoring-applied-rules";
import { EMPTY_VALUE } from "@/constants/empty-value";
import { VIEWER_ROW_CLASS } from "@/components/common/viewer-row";
import { InactiveMemberSuffix } from "@/components/common/inactive-member-suffix";

interface KillParticipantRowProps {
  participant: KillDetailParticipant;
  scoring?: KillParticipantScoring | null;
  participantNames?: ReadonlyMap<number, string>;
  rank: number;
  /** Marks the viewer's own place. */
  isViewer?: boolean;
  /** The member has left the Lootlog. */
  isInactive?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  guildId?: string;
  eventId?: string;
  canEdit?: boolean;
  onEditPoints?: (
    killPointId: string,
    pointsDelta: number,
    comment?: string,
  ) => Promise<void>;
  isEditPending?: boolean;
}

type Translate = (key: string, options?: TOptions) => string;

const buildParticipantScoringView = (
  participant: KillDetailParticipant,
  t: Translate,
) => {
  const aggregatedMaps = participant.mapData
    ? aggregateMapData(participant.mapData)
    : [];

  const totalAfkSeconds = aggregatedMaps.reduce(
    (sum, map) => sum + map.afkTimeSeconds,
    0,
  );

  const scoring = getScoringBreakdown(participant);
  const hasManualAdjustment = scoring.manualAdjustmentPoints !== 0;
  const scoringItems = getScoringItems({ ...scoring, t });

  return {
    aggregatedMaps,
    hasManualAdjustment,
    scoringItems,
    totalAfkSeconds,
    trackingDuration:
      participant.trackingDurationSeconds !== null &&
      participant.trackingDurationSeconds !== undefined
        ? formatDurationHuman(participant.trackingDurationSeconds)
        : EMPTY_VALUE,
    trackingPercentage:
      participant.trackingDurationPercentage !== null &&
      participant.trackingDurationPercentage !== undefined
        ? `${Math.round(participant.trackingDurationPercentage)}%`
        : EMPTY_VALUE,
  };
};

export const KillParticipantRow = ({
  participant,
  scoring = null,
  participantNames,
  rank,
  isViewer,
  isInactive,
  isExpanded,
  onToggle,
  guildId,
  eventId,
  canEdit,
  onEditPoints,
  isEditPending,
}: KillParticipantRowProps) => {
  const { t } = useTranslation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const {
    aggregatedMaps,
    hasManualAdjustment,
    scoringItems,
    totalAfkSeconds,
    trackingDuration,
    trackingPercentage,
  } = buildParticipantScoringView(participant, t);

  const avatarUrl = getDiscordAvatarUrl(
    participant.member.userId,
    participant.member.avatar,
    32,
  );

  const roleCssColor = getCustomRoleCssColor(
    getMemberDisplayRole(participant.member.roles)?.color,
  );

  const memberLinkParams =
    guildId && eventId
      ? {
          guildId,
          eventId,
          memberId: String(participant.member.id),
        }
      : null;

  const handleDialogSubmit = async ({
    pointsDelta,
    comment,
  }: {
    pointsDelta: number;
    comment?: string;
  }) => {
    await onEditPoints?.(participant.id, pointsDelta, comment);
  };

  const memberName = (
    <>
      {participant.member.name}
      {isInactive && <InactiveMemberSuffix />}
    </>
  );

  return (
    <div
      aria-current={isViewer || undefined}
      className="border-b border-border last:border-b-0"
    >
      <div
        className={cn(
          "grid min-h-14 grid-cols-[1.5rem_minmax(0,1fr)_4.5rem_5.5rem] items-center gap-2 px-3 py-0 transition-colors hover:bg-muted/40 lg:grid-cols-[2rem_minmax(0,1fr)_7rem_5rem_6.5rem_5rem]",
          isViewer && VIEWER_ROW_CLASS,
        )}
      >
        <span className="text-center text-xs font-medium tabular-nums text-muted-foreground">
          {rank}
        </span>

        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-xs">
              {participant.member.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            {memberLinkParams ? (
              <TextLink
                className="inline-flex w-fit max-w-full min-w-0 items-center text-sm"
                render=<Link
                  to="/$guildId/events/$eventId/members/$memberId"
                  params={memberLinkParams}
                />
              >
                <span className="truncate">{memberName}</span>
              </TextLink>
            ) : (
              <span
                className="block truncate text-sm font-semibold"
                style={roleCssColor ? { color: roleCssColor } : undefined}
              >
                {memberName}
              </span>
            )}
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-[10px] tabular-nums text-muted-foreground lg:hidden">
              <span>{trackingDuration}</span>
              <span aria-hidden="true">·</span>
              <span>{trackingPercentage}</span>
              {totalAfkSeconds > 0 ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-400">
                    {t("events.kills.afkTime")}:{" "}
                    {formatDurationHuman(totalAfkSeconds)}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <span className="hidden text-right text-sm tabular-nums text-muted-foreground lg:block">
          {trackingDuration}
        </span>
        <span className="hidden text-right text-sm tabular-nums text-muted-foreground lg:block">
          {totalAfkSeconds > 0 ? (
            <span className="text-amber-400">
              {formatDurationHuman(totalAfkSeconds)}
            </span>
          ) : (
            EMPTY_VALUE
          )}
        </span>

        <div className="flex items-center justify-end gap-1">
          {hasManualAdjustment ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    className="inline-flex size-6 shrink-0 items-center justify-center text-amber-400"
                    tabIndex={0}
                    aria-label={t("events.points.modified")}
                  >
                    <Info className="size-3.5" />
                  </span>
                }
              />
              <TooltipContent>
                <p>{t("events.points.modified")}</p>
              </TooltipContent>
            </Tooltip>
          ) : null}
          <span className="font-bold tabular-nums text-primary">
            {formatPoints(participant.points)}
          </span>
        </div>

        <div className="flex items-center justify-end gap-0 lg:gap-0.5">
          {canEdit ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => setIsEditDialogOpen(true)}
                    disabled={isEditPending}
                    aria-label={t("events.points.edit")}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent>
                <p>{t("events.points.edit")}</p>
              </TooltipContent>
            </Tooltip>
          ) : null}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground"
            aria-expanded={isExpanded}
            aria-label={t(
              isExpanded
                ? "events.kills.collapseParticipant"
                : "events.kills.expandParticipant",
              { memberName: participant.member.name },
            )}
            onClick={onToggle}
          >
            <ChevronDown
              className={cn(
                "size-4 transition-[rotate] duration-200 ease-emphasized motion-reduce:transition-none",
                isExpanded && "rotate-180",
              )}
            />
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <div className="grid gap-4 border-t border-border/60 bg-muted/40 px-5 py-4 lg:grid-cols-2 lg:px-6">
          <div className="min-w-0">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("events.kills.scoringBreakdown")}
            </p>
            <ScoringBreakdownList
              items={scoringItems}
              totalPoints={participant.points}
            />
          </div>

          {scoring ? (
            <div className="min-w-0 lg:col-span-2 lg:row-start-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("events.kills.presenceBreakdown")}
              </p>
              <p className="mb-2 text-xs text-muted-foreground">
                {t("events.kills.presenceBreakdownHint")}
              </p>
              <ScoringPresenceBreakdown
                analysis={scoring.analysis}
                participantId={participant.memberId}
                explanation={scoring.explain(participant)}
                rules={scoring.rules.rules}
                nameOf={(memberId) =>
                  participantNames?.get(Number(memberId)) ?? String(memberId)
                }
              />
            </div>
          ) : null}

          <div className="min-w-0">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("events.kills.mapBreakdown")}
            </p>
            {aggregatedMaps.length > 0 ? (
              <div className="divide-y divide-border/60">
                {aggregatedMaps.map((mapInfo) => (
                  <div
                    key={mapInfo.mapId}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-1.5 text-xs first:pt-0"
                  >
                    <span className="flex min-w-0 items-center gap-1.5 truncate font-medium">
                      <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                      {mapInfo.mapName}
                    </span>
                    <span className="text-right tabular-nums text-muted-foreground">
                      {formatDurationHuman(mapInfo.assignmentDurationSeconds)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                icon={MapPin}
                title={t("events.kills.noMapBreakdown")}
              />
            )}
          </div>
        </div>
      ) : null}

      <ManualPointsEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title={t("events.points.killDialogTitle", {
          memberName: participant.member.name,
        })}
        description={t("events.points.killDialogDescription", {
          memberName: participant.member.name,
        })}
        currentPoints={participant.points}
        isPending={isEditPending}
        onSubmit={handleDialogSubmit}
      />
    </div>
  );
};
