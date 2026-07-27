import { getMargonemProfileUrl } from "@/constants/margonem";
import type { MemberLootlogConfigSummaryResponseDtoOutputCharactersItemMetadataStatus } from "@lootlog/api-client/models/main/member-lootlog-config-summary-response-dto-output-characters-item-metadata-status";

type MemberLootlogProfileTargetInput = {
  accountId: string;
  characterId: string;
  world: string | null;
};

type MemberLootlogProfileTarget = {
  accountId: number;
  characterId?: number;
  href: string;
  world?: string;
};

export function getMemberLootlogConfigMetadataTranslationKey(
  metadataStatus: MemberLootlogConfigSummaryResponseDtoOutputCharactersItemMetadataStatus,
) {
  if (metadataStatus === "resolved") {
    return null;
  }

  if (metadataStatus === "invalid_character_ref") {
    return "settings.members.lootlogInvalidCharacterRef";
  }

  return "settings.members.lootlogMissingSnapshot";
}

export function getMemberLootlogProfileTarget({
  accountId,
  characterId,
  world,
}: MemberLootlogProfileTargetInput): MemberLootlogProfileTarget | null {
  const parsedAccountId = Number(accountId);
  const parsedCharacterId = Number(characterId);
  const href = getMargonemProfileUrl({ accountId, characterId, world });
  if (!href) {
    return null;
  }

  if (
    !Number.isInteger(parsedCharacterId) ||
    parsedCharacterId <= 0 ||
    !world
  ) {
    return {
      accountId: parsedAccountId,
      href,
    };
  }

  return {
    accountId: parsedAccountId,
    characterId: parsedCharacterId,
    href,
    world,
  };
}
