import { Badge } from "@lootlog/ui/components/badge";
import { Card } from "@lootlog/ui/components/card";
import { PlayerTile } from "@/components/tiles";
import {
  getMemberLootlogConfigMetadataTranslationKey,
  getMemberLootlogProfileTarget,
} from "@/features/guild/settings/members/member-lootlog-config.utils";
import { useTranslation } from "react-i18next";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getMembersControllerGetMemberLootlogConfigSummaryQueryKey,
  useMembersControllerGetMemberLootlogConfigSummary,
} from "@lootlog/api-client/react-query/main/members";
import type { MemberResponseDto as GuildMember } from "@lootlog/api-client/models/main/member-response-dto";

export type MemberLootlogConfigCardProps = {
  member: GuildMember;
  canManageMembers: boolean;
};

export const MemberLootlogConfigCard = ({
  member,
  canManageMembers,
}: MemberLootlogConfigCardProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const summaryQuery = useMembersControllerGetMemberLootlogConfigSummary(
    {
      guildId: guildId ?? "",
      discordId: member.userId,
    },
    {
      query: {
        queryKey: getMembersControllerGetMemberLootlogConfigSummaryQueryKey({
          guildId: guildId ?? "",
          discordId: member.userId,
        }),
        enabled: Boolean(guildId && canManageMembers),
      },
    },
  );

  if (!canManageMembers) {
    return null;
  }

  return (
    <Card className="border-border bg-card p-4  gap-3">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">
          {t("settings.members.lootlogTitle")}
        </h3>
        {summaryQuery.data && (
          <p className="text-xs text-muted-foreground">
            {t("settings.members.lootlogCounts", {
              enabled: summaryQuery.data.enabledCharacterCount,
              configured: summaryQuery.data.configuredCharacterCount,
            })}
          </p>
        )}
      </div>

      {summaryQuery.isLoading && (
        <p className="text-sm text-muted-foreground">
          {t("settings.members.lootlogLoading")}
        </p>
      )}

      {summaryQuery.isError && (
        <p className="text-sm text-destructive">
          {t("settings.members.lootlogError")}
        </p>
      )}

      {summaryQuery.data && summaryQuery.data.characters.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("settings.members.lootlogEmpty")}
        </p>
      )}

      {summaryQuery.data && summaryQuery.data.characters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {summaryQuery.data.characters.map((character) => {
            const characterName =
              character.characterName ??
              t("settings.members.lootlogUnknownCharacter");
            const metadataTranslationKey =
              getMemberLootlogConfigMetadataTranslationKey(
                character.metadataStatus,
              );
            const profileTarget = getMemberLootlogProfileTarget({
              accountId: character.accountId,
              characterId: character.characterId,
              world: character.world,
            });
            const secondaryText = metadataTranslationKey
              ? t(metadataTranslationKey)
              : (character.world ??
                t("settings.members.lootlogWorldUnavailable"));
            const characterProfileTarget =
              profileTarget &&
              profileTarget.characterId !== undefined &&
              profileTarget.world !== undefined
                ? profileTarget
                : null;

            return (
              <div
                key={`${character.accountId}:${character.characterId}`}
                className="flex max-w-full items-center gap-2 rounded-xl border border-border/60 bg-background px-2.5 py-2"
              >
                <PlayerTile
                  player={{
                    id: `${character.accountId}:${character.characterId}`,
                    name: character.characterName ?? undefined,
                    icon: character.icon,
                  }}
                  className="shrink-0 scale-[0.82]"
                  accountId={
                    characterProfileTarget
                      ? characterProfileTarget.accountId
                      : undefined
                  }
                  characterId={
                    characterProfileTarget
                      ? characterProfileTarget.characterId
                      : undefined
                  }
                  world={
                    characterProfileTarget
                      ? characterProfileTarget.world
                      : undefined
                  }
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {profileTarget ? (
                      <a
                        href={profileTarget.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-medium transition-colors hover:text-primary hover:underline"
                      >
                        {characterName}
                      </a>
                    ) : (
                      <p className="truncate text-sm font-medium">
                        {characterName}
                      </p>
                    )}
                    <Badge
                      variant={character.enabledForGuild ? "green" : "outline"}
                      className="rounded-md px-1.5 py-0 text-[10px]"
                    >
                      {character.enabledForGuild
                        ? t("settings.members.lootlogEnabled")
                        : t("settings.members.lootlogDisabled")}
                    </Badge>
                  </div>
                  <p className="max-w-[220px] text-xs text-muted-foreground">
                    {secondaryText}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
