import type { MargonemCharacter } from "@/api/characters.api";

type CharacterProfileIds = {
  accountId: number;
  characterId: number;
};

export const sanitizeFriendInviteNick = (nick: string) => {
  return nick
    .trim()
    .split(" ")
    .join("_")
    .replace(/[&=?#]/g, "");
};

export const inviteCharacterToParty = (characterId: string | number) => {
  window._g(`party&a=inv&id=${characterId}`);
};

export const inviteCharacterToFriends = (nick: string) => {
  window._g(`friends&a=finvite&nick=${sanitizeFriendInviteNick(nick)}`);
};

export const showCharacterEquipment = (
  character: MargonemCharacter & { account: number },
) => {
  window.Engine.showEqManager.update({
    id: character.id,
    nick: character.nick,
    prof: character.prof,
    icon: character.icon,
    lvl: character.lvl,
    account: character.account,
  });
};

export const showCharacterProfile = ({
  accountId,
  characterId,
}: CharacterProfileIds) => {
  window.Engine.iframeWindowManager.newPlayerProfile({
    accountId,
    characterId,
  });
};
