import { Fragment, useState } from "react";
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
import type { KillDetailParticipant } from "../../hooks/queries/use-kill-detail";
import { aggregateMapData } from "../../utils/aggregate-map-data";
import { formatDurationHuman } from "../../utils/format-duration";
import { formatPoints, formatSignedPoints } from "../../utils/format-points";
import { normalizeBonusBreakdown } from "../../utils/normalize-bonus-breakdown";
import { ManualPointsEditDialog } from "../dialogs/manual-points-edit-dialog";

interface KillParticipantRowProps {
  participant: KillDetailParticipant;
  rank: number;
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

type Translate = (key: string, options?: Record<string, unknown>) => string;

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
  const bonusBreakdown = normalizeBonusBreakdown(participant.bonusBreakdown);
  const manualAdjustmentPoints = participant.manualAdjustmentPoints ?? 0;
  const hasManualAdjustment = manualAdjustmentPoints !== 0;
  const autoTotalPoints = participant.points - manualAdjustmentPoints;
  const fallbackBonusPoints =
    Math.round(Math.max(0, autoTotalPoints - participant.basePoints) * 10_000) /
    10_000;
  const bonusPoints =
    bonusBreakdown.length > 0
      ? Math.round(
          bonusBreakdown.reduce((sum, item) => sum + item.points, 0) * 10_000,
        ) / 10_000
      : fallbackBonusPoints;
  const capReduction = Math.max(
    0,
    participant.basePoints + bonusPoints - autoTotalPoints,
  );
  const scoringItems = [
    {
      label: t("events.kills.pointsTooltip.basePoints"),
      value: formatPoints(participant.basePoints),
      valueClassName: "text-foreground",
    },
    ...bonusBreakdown.map((bonus) => ({
      label: t("events.kills.pointsTooltip.bonusItem", {
        name: bonus.ruleName ?? t("events.kills.pointsTooltip.unnamedBonus"),
      }),
      value: `+${formatPoints(bonus.points)}`,
      valueClassName: "text-cyan-400",
    })),
    ...(bonusBreakdown.length === 0 && bonusPoints > 0
      ? [
          {
            label: t("events.kills.pointsTooltip.bonusTotal"),
            value: `+${formatPoints(bonusPoints)}`,
            valueClassName: "text-cyan-400",
          },
        ]
      : []),
    ...(capReduction > 0
      ? [
          {
            label: t("events.kills.pointsTooltip.capReduction"),
            value: `-${formatPoints(capReduction)}`,
            valueClassName: "text-amber-400",
          },
        ]
      : []),
    ...(hasManualAdjustment
      ? [
          {
            label: t("events.kills.pointsTooltip.manualAdjustment"),
            value: formatSignedPoints(manualAdjustmentPoints),
            valueClassName: "text-amber-400",
          },
        ]
      : []),
  ];

  return {
    aggregatedMaps,
    hasManualAdjustment,
    scoringItems,
    totalAfkSeconds,
    trackingDuration:
      typeof participant.trackingDurationSeconds === "number"
        ? formatDurationHuman(participant.trackingDurationSeconds)
        : "—",
    trackingPercentage:
      typeof participant.trackingDurationPercentage === "number"
        ? `${Math.round(participant.trackingDurationPercentage)}%`
        : "—",
  };
};

export const KillParticipantRow = ({
  participant,
  rank,
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
    participant.member.roles?.[0]?.color,
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

  return (
    <div className="border-t border-border/70 first:border-t-0">
      <div className="grid min-h-14 grid-cols-[1.5rem_minmax(0,1fr)_4.5rem_5.5rem] items-center gap-2 px-3 py-0 transition-colors hover:bg-muted/20 lg:min-h-12 lg:grid-cols-[2rem_minmax(0,1fr)_7rem_5rem_6.5rem_5rem]">
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
              <Link
                to="/$guildId/events/$eventId/members/$memberId"
                params={memberLinkParams}
                className="inline-flex w-fit max-w-full min-w-0 items-center rounded-sm text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                style={roleCssColor ? { color: roleCssColor } : undefined}
              >
                <span className="truncate">{participant.member.name}</span>
              </Link>
            ) : (
              <span
                className="block truncate text-sm font-semibold"
                style={roleCssColor ? { color: roleCssColor } : undefined}
              >
                {participant.member.name}
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
            "—"
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
                    size="icon"
                    variant="ghost"
                    className="size-11 text-muted-foreground lg:size-9"
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
            size="icon"
            variant="ghost"
            className="size-11 text-muted-foreground lg:size-9"
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
                "size-4 transition-transform",
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
            <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1.5 text-xs">
              {scoringItems.map((item) => (
                <Fragment key={`${item.label}:${item.value}`}>
                  <dt className="truncate text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd
                    className={cn(
                      "text-right font-semibold tabular-nums",
                      item.valueClassName,
                    )}
                  >
                    {item.value}
                  </dd>
                </Fragment>
              ))}
              <dt className="border-t border-border/60 pt-1.5 font-medium">
                {t("events.kills.pointsTooltip.total")}
              </dt>
              <dd className="border-t border-border/60 pt-1.5 text-right font-bold tabular-nums text-primary">
                {formatPoints(participant.points)}
              </dd>
            </dl>
          </div>

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
              <p className="text-xs text-muted-foreground">
                {t("events.kills.noMapBreakdown")}
              </p>
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
