import { MARGONEM_PROFILE_URL } from "@/constants/margonem";
import type { MemberLootlogConfigSummaryResponseDtoOutputCharactersItemMetadataStatus } from "@/lib/api/generated/main/model";

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

  if (!Number.isInteger(parsedAccountId) || parsedAccountId <= 0) {
    return null;
  }

  if (
    !Number.isInteger(parsedCharacterId) ||
    parsedCharacterId <= 0 ||
    !world
  ) {
    return {
      accountId: parsedAccountId,
      href: `${MARGONEM_PROFILE_URL},${parsedAccountId}`,
    };
  }

  return {
    accountId: parsedAccountId,
    characterId: parsedCharacterId,
    href: `${MARGONEM_PROFILE_URL},${parsedAccountId}#char_${parsedCharacterId},${world}`,
    world,
  };
}
