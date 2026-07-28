import { Card } from "@lootlog/ui/components/card";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "@lootlog/ui/components/accordion";
import {
  LogIn,
  LogOut,
  Calendar,
  User,
  Monitor,
  Gamepad2,
  Hash,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { PlayerTile } from "@/features/guild/loots-list/components/loots-list/player-tile";
import type { PaginatedActivitiesResponseDtoDataItem } from "@lootlog/api-client/models/activity/paginated-activities-response-dto-data-item";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MARGONEM_GUILD_URL } from "@/constants/margonem";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useMembersControllerGetGuildMemberReferences } from "@lootlog/api-client/react-query/main/members";

type Props = {
  activity: PaginatedActivitiesResponseDtoDataItem;
};

export const ActivityLogsListItem: React.FC<Props> = ({ activity }) => {
  const [isOpen, setIsOpen] = useState("");
  const guildId = useGuildId();
  const { data: members } = useMembersControllerGetGuildMemberReferences(
    { guildId: guildId ?? "" },
    { includeInactive: true },
  );
  const { t } = useTranslation();
  const activityTypeConfig = {
    CONNECT_EVENT: {
      icon: LogIn,
      label: t("activityLogs.list.types.CONNECT_EVENT"),
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    DISCONNECT_EVENT: {
      icon: LogOut,
      label: t("activityLogs.list.types.DISCONNECT_EVENT"),
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  } as const;
  const sourceConfigMap = {
    GAME: {
      icon: Gamepad2,
      label: t("activityLogs.list.sources.GAME"),
    },
    WEB_APP: {
      icon: Monitor,
      label: t("activityLogs.list.sources.WEB_APP"),
    },
  } as const;

  const typeConfig = activityTypeConfig[activity.type];
  const sourceConfig = sourceConfigMap[activity.source];
  const TypeIcon = typeConfig.icon;
  const SourceIcon = sourceConfig.icon;

  const formattedDate = format(
    new Date(activity.createdAt),
    "yyyy-MM-dd HH:mm:ss",
    {
      locale: pl,
    },
  );

  const hasActorSnapshot =
    activity.actorSnapshot && activity.actorSnapshot.icon;
  const hasAdditionalData =
    activity.details && Object.keys(activity.details).length > 0;

  const discordMember = activity.discordId
    ? members?.find((m) => m.userId === activity.discordId)
    : undefined;

  const handleCardClick = () => {
    if (hasAdditionalData) {
      setIsOpen(isOpen === "details" ? "" : "details");
    }
  };

  return (
    <Card
      className={`p-4 transition-all duration-300 border bg-background  ${
        hasAdditionalData
          ? "cursor-pointer border-border hover:bg-card hover:border-primary/50"
          : "border-border"
      }`}
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${typeConfig.bgColor}`}>
          <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{typeConfig.label}</span>
              <Badge variant="outline" className="text-xs">
                <SourceIcon className="h-3 w-3 mr-1" />
                {sourceConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                <Calendar className="h-3 w-3" />
                {formattedDate}
              </div>
              {hasAdditionalData && (
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                    isOpen === "details" ? "rotate-180" : ""
                  }`}
                />
              )}
            </div>
          </div>

          {hasActorSnapshot && (
            <div className="flex items-center gap-3 mb-3">
              <PlayerTile
                player={{
                  id: activity.actorSnapshot?.id,
                  name: activity.actorSnapshot?.name,
                  lvl: activity.actorSnapshot?.lvl,
                  prof: activity.actorSnapshot?.prof,
                  icon: activity.actorSnapshot?.icon,
                }}
                className="scale-80 top-1"
                accountId={activity.actorSnapshot?.accountId}
                characterId={activity.actorSnapshot?.characterId}
                world={activity.world ?? undefined}
              />
              <div className="flex flex-col">
                <span className="font-medium text-sm">
                  {activity.actorSnapshot?.name}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {activity.actorSnapshot?.lvl}
                  {activity.actorSnapshot?.prof?.[0]?.toLowerCase()}
                  {activity.actorSnapshot?.clanName && activity.world && (
                    <>
                      &nbsp;•
                      {activity.actorSnapshot.clanId ? (
                        <a
                          href={`${MARGONEM_GUILD_URL},${activity.world},${activity.actorSnapshot.clanId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary hover:underline transition-colors text-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {activity.actorSnapshot.clanName}
                        </a>
                      ) : (
                        <span>{activity.actorSnapshot.clanName}</span>
                      )}
                    </>
                  )}
                </span>
              </div>
            </div>
          )}

          {!hasActorSnapshot && activity.actorSnapshot && (
            <div className="flex items-center gap-2 text-sm mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {activity.actorSnapshot.name}({activity.actorSnapshot.lvl}
                {activity.actorSnapshot.prof?.[0]?.toLowerCase() ?? ""})
              </span>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs mb-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Hash className="h-3 w-3" />
              <span>{t("activityLogs.list.id", { id: activity.id })}</span>
            </div>

            {activity.discordId && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Monitor className="h-3 w-3" />
                <span>
                  {t("activityLogs.list.discord")}
                  {discordMember ? (
                    <span className="font-medium text-foreground">
                      {discordMember.name}
                    </span>
                  ) : (
                    activity.discordId
                  )}
                </span>
              </div>
            )}
            {activity.world && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>
                  {t("activityLogs.list.world", {
                    world:
                      activity.world.charAt(0).toUpperCase() +
                      activity.world.slice(1),
                  })}
                </span>
              </div>
            )}
          </div>

          {hasAdditionalData && (
            <Accordion
              type="single"
              collapsible
              className="w-full"
              value={isOpen}
              onValueChange={setIsOpen}
            >
              <AccordionItem value="details" className="border-none">
                <AccordionContent>
                  <div className="space-y-3 pt-2 border-t border-border/30 mt-2">
                    {activity.details &&
                      Object.keys(activity.details).length > 0 && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <div className="font-semibold text-sm mb-2">
                            {t("activityLogs.list.additionalData")}
                          </div>
                          <pre className="text-xs overflow-x-auto">
                            {JSON.stringify(activity.details, null, 2)}
                          </pre>
                        </div>
                      )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      </div>
    </Card>
  );
};
