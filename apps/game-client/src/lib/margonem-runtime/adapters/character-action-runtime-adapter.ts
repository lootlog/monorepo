import type { MargonemCharacter } from "@/api/characters.api";

type CharacterProfileIds = {
  accountId: number;
  characterId: number;
};

type CharacterActionRuntimeWindow = Window & {
  Engine?: {
    chatController?: {
      getChatInputWrapper?: () => {
        setPrivateMessageProcedure?: (nick: string) => void;
      };
    };
    iframeWindowManager?: {
      newPlayerProfile?: (ids: CharacterProfileIds) => void;
    };
    showEqManager?: {
      update?: (character: {
        account: number;
        icon: string;
        id: number;
        lvl: number;
        nick: string;
        prof: string;
      }) => void;
    };
  };
  _g?: (command: string) => unknown;
};

const getRuntimeWindow = () => window as CharacterActionRuntimeWindow;

export const sanitizeFriendInviteNick = (nick: string) => {
  return nick
    .trim()
    .split(" ")
    .join("_")
    .replace(/[&=?#]/g, "");
};

export const inviteCharacterToParty = (characterId: string | number) => {
  getRuntimeWindow()._g?.(`party&a=inv&id=${characterId}`);
};

export const inviteCharacterToFriends = (nick: string) => {
  getRuntimeWindow()._g?.(
    `friends&a=finvite&nick=${sanitizeFriendInviteNick(nick)}`,
  );
};

export const showCharacterEquipment = (
  character: MargonemCharacter & { account: number },
) => {
  getRuntimeWindow().Engine?.showEqManager?.update?.({
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
  getRuntimeWindow().Engine?.iframeWindowManager?.newPlayerProfile?.({
    accountId,
    characterId,
  });
};

export const startPrivateMessage = (nick: string) => {
  getRuntimeWindow()
    .Engine?.chatController?.getChatInputWrapper?.()
    .setPrivateMessageProcedure?.(nick);
};
