import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import type { TOptions } from "i18next";
import { BandSection } from "@/components/common/band-section";
import { DetailField } from "@/components/common/detail-field";
import { ListTileEmpty } from "@/components/common/list-tile-empty";
import type { MemberResponseDto as GuildMember } from "@lootlog/client/main";
import type { MemberActivityStats } from "@/features/guild/settings/members/member-activity-stats-api";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  Clock3,
  Gamepad2,
  Globe2,
  MousePointerClick,
  Shield,
} from "lucide-react";
import {
  getMemberAccessState,
  isMemberProblematic,
} from "@/features/guild/settings/members/member-list-item.utils";
import { getMemberAccessSummary } from "../member-access-summary";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { getMemberDiscordSyncPresentation } from "@/features/guild/settings/members/member-discord-sync.utils";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { RoleTile } from "../../roles/role-tile";

export type MemberDataProps = {
  member: GuildMember;
  /** The Organization as the route names it, for links to the member's roles. */
  guildId: string;
  webActivityStats?: MemberActivityStats;
  gameActivityStats?: MemberActivityStats;
  isOnlineOnWeb?: boolean;
  isOnlineInGame?: boolean;
};

const formatDateTime = (
  timestamp: string | null | undefined,
  fallback: string,
) => {
  if (!timestamp) {
    return fallback;
  }

  return `${getRelativeTime(timestamp)} (${timestampToDate(timestamp)})`;
};

type Translate = (key: string, options?: TOptions) => string;

const getMemberActivityPresentation = ({
  gameActivityStats,
  t,
  webActivityStats,
}: Pick<MemberDataProps, "gameActivityStats" | "webActivityStats"> & {
  t: Translate;
}) => {
  const emptyValueLabel = t("settings.members.discordSync.values.notAvailable");

  return {
    emptyValueLabel,
    gameLastSeenAt: formatDateTime(
      gameActivityStats?.lastSeenAt,
      emptyValueLabel,
    ),
    lastActivityLabel: webActivityStats?.lastSeenAt
      ? getRelativeTime(webActivityStats.lastSeenAt)
      : t("settings.members.webActivity.noData"),
    webLastSeenAt: formatDateTime(
      webActivityStats?.lastSeenAt,
      emptyValueLabel,
    ),
  };
};

const getMemberSyncRows = (
  member: GuildMember,
  emptyValueLabel: string,
  t: Translate,
) => [
  {
    label: t("settings.members.discordSync.fields.technicalStatus"),
    value: member.lastDiscordStatus ?? emptyValueLabel,
  },
  {
    label: t("settings.members.discordSync.fields.lastAttemptAt"),
    value: formatDateTime(member.lastDiscordAttemptAt, emptyValueLabel),
  },
  {
    label: t("settings.members.discordSync.fields.lastConfirmedAt"),
    value: formatDateTime(member.lastDiscordSyncAt, emptyValueLabel),
  },
  ...(member.refreshQueued
    ? [
        {
          label: t("settings.members.discordSync.fields.refreshQueue"),
          value: t("settings.members.discordSync.values.queued"),
        },
      ]
    : []),
  ...(member.nextRefreshAt
    ? [
        {
          label: t("settings.members.discordSync.fields.nextRefreshAt"),
          value: formatDateTime(member.nextRefreshAt, emptyValueLabel),
        },
      ]
    : []),
];

export const MemberData = ({
  member,
  guildId,
  webActivityStats,
  gameActivityStats,
  isOnlineOnWeb = false,
  isOnlineInGame = false,
}: MemberDataProps) => {
  const { t } = useTranslation();
  const syncPresentation = getMemberDiscordSyncPresentation(member);

  const accessState = getMemberAccessState({
    member,
    isOnline: isOnlineOnWeb || isOnlineInGame,
  });

  const { emptyValueLabel, gameLastSeenAt, lastActivityLabel, webLastSeenAt } =
    getMemberActivityPresentation({ gameActivityStats, t, webActivityStats });

  const syncRows = getMemberSyncRows(member, emptyValueLabel, t);

  return (
    <div className="pb-6">
      <BandSection
        id="member-access"
        title={t("settings.members.access.title")}
        description={getMemberAccessSummary(accessState, t).description}
      >
        {(!member.active || isMemberProblematic(member)) && (
          <Alert variant="alert">
            <AlertTriangle />
            <AlertDescription>
              {member.active
                ? t("settings.members.syncProblemHint")
                : t("settings.members.reactivateHint")}
            </AlertDescription>
          </Alert>
        )}
        <dl className="divide-y divide-border/60">
          <DetailField label={t("settings.members.access.status")}>
            {member.active
              ? t("settings.members.statusActive")
              : t("settings.members.statusInactive")}
          </DetailField>
          <DetailField label={t("settings.members.access.discord")}>
            {t(
              `settings.members.discordSync.status.${syncPresentation.copyKey}.title`,
            )}
          </DetailField>
          <DetailField label={t("settings.members.access.lastActivity")}>
            {lastActivityLabel}
          </DetailField>
        </dl>
      </BandSection>

      <BandSection
        id="member-discord-sync"
        title={t("settings.members.discordSync.title")}
      >
        <dl className="divide-y divide-border/60">
          {syncRows.map((row) => (
            <DetailField key={row.label} label={row.label}>
              {row.value}
            </DetailField>
          ))}
        </dl>
        {member.isStale && (
          <Alert variant="alert">
            <Clock3 />
            <AlertDescription>
              {t("settings.members.discordSync.staleAccessHint")}
            </AlertDescription>
          </Alert>
        )}
      </BandSection>

      <BandSection
        id="member-activity"
        title={t("settings.members.webActivity.title")}
      >
        <dl className="divide-y divide-border/60">
          <DetailField
            label={t("settings.members.webActivity.fields.lastSeenAt")}
          >
            {webLastSeenAt}
          </DetailField>
          <DetailField
            label={t("settings.members.webActivity.fields.lastSeenInGameAt")}
          >
            {gameLastSeenAt}
          </DetailField>
          <DetailField
            label={t("settings.members.webActivity.fields.webVisitCount")}
          >
            <span className="flex items-center gap-1.5 tabular-nums">
              <MousePointerClick className="size-3.5 text-muted-foreground" />
              {webActivityStats?.visitCount ?? 0}
            </span>
          </DetailField>
          <DetailField
            label={t("settings.members.webActivity.fields.gameVisitCount")}
          >
            <span className="flex items-center gap-1.5 tabular-nums">
              <Gamepad2 className="size-3.5 text-muted-foreground" />
              {gameActivityStats?.visitCount ?? 0}
            </span>
          </DetailField>
          <DetailField
            label={t("settings.members.webActivity.fields.webStatus")}
          >
            <span className="flex items-center gap-1.5">
              <Activity className="size-3.5 text-muted-foreground" />
              {isOnlineOnWeb
                ? t("settings.members.webActivity.onlineSources.web")
                : t("settings.members.webActivity.offline")}
            </span>
          </DetailField>
          <DetailField
            label={t("settings.members.webActivity.fields.gameStatus")}
          >
            <span className="flex items-center gap-1.5">
              <Globe2 className="size-3.5 text-muted-foreground" />
              {isOnlineInGame
                ? t("settings.members.webActivity.onlineSources.game")
                : t("settings.members.webActivity.offline")}
            </span>
          </DetailField>
        </dl>
      </BandSection>

      <BandSection
        id="member-roles"
        title={t("settings.members.rolesTitle")}
        count={member.roles.length}
        tiled
      >
        {member.roles.length === 0 ? (
          <ListTileEmpty icon={Shield}>
            {t("settings.members.noRoles")}
          </ListTileEmpty>
        ) : (
          member.roles.map((role) => (
            <RoleTile key={role.id} guildId={guildId} role={role} />
          ))
        )}
      </BandSection>
    </div>
  );
};
