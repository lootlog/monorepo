import { Avatar, AvatarImage } from "@lootlog/ui/components/avatar";
import { Badge } from "@lootlog/ui/components/badge";
import { Card } from "@lootlog/ui/components/card";
import { useTranslation } from "react-i18next";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getMembersControllerGetMemberLootlogConfigSummaryQueryKey,
  useMembersControllerGetMemberLootlogConfigSummary,
} from "@/lib/api/generated/main/members/members";
import type {
  MemberLootlogConfigSummaryResponseDtoOutputCharactersItemMetadataStatus,
  MemberResponseDto as GuildMember,
} from "@/lib/api/generated/main/model";

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
    <Card className="bg-card/50 backdrop-blur-sm border-border p-4 gap-4">
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
        <div className="space-y-3">
          {summaryQuery.data.characters.map((character) => (
            <div
              key={`${character.accountId}:${character.characterId}`}
              className="rounded-xl border border-border/60 bg-background/40 px-3 py-3"
            >
              <div className="flex items-start gap-3">
                <Avatar className="size-10 shrink-0 rounded-lg">
                  <AvatarImage src={character.icon ?? undefined} />
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">
                      {character.characterName ??
                        t("settings.members.lootlogUnknownCharacter")}
                    </p>
                    <Badge
                      variant={character.enabledForGuild ? "green" : "outline"}
                    >
                      {character.enabledForGuild
                        ? t("settings.members.lootlogEnabled")
                        : t("settings.members.lootlogDisabled")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {character.world ??
                      t(getMetadataTranslationKey(character.metadataStatus))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.members.lootlogCharacterIds", {
                      accountId: character.accountId,
                      characterId: character.characterId,
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

function getMetadataTranslationKey(
  metadataStatus: MemberLootlogConfigSummaryResponseDtoOutputCharactersItemMetadataStatus,
) {
  if (metadataStatus === "invalid_character_ref") {
    return "settings.members.lootlogInvalidCharacterRef";
  }

  return "settings.members.lootlogMissingSnapshot";
}
