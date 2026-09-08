import type { PartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import type { ChatMessage, ChatCharacterData } from "@/api/chat.api";
import type {
  MemberResponseDto,
  RoleResponseDtoOutput,
} from "@lootlog/client/main";

export const createChatCharacter = (
  overrides: Partial<ChatCharacterData> = {},
): ChatCharacterData => ({
  nick: "Hero",
  id: 1,
  acc: 1,
  lvl: 300,
  prof: "w",
  icon: "hero.gif",
  ...overrides,
});
export const createChatMessage = (
  overrides: Partial<ChatMessage> = {},
): ChatMessage => ({
  id: "message-1",
  guildId: "guild-1",
  senderId: "sender-1",
  message: "Hello",
  timestamp: "2026-04-22T10:00:00.000Z",
  type: "NORMAL",
  characterData: createChatCharacter(),
  canEdit: false,
  canDelete: false,
  ...overrides,
});
export const createChatRole = (
  overrides: Partial<RoleResponseDtoOutput> = {},
): RoleResponseDtoOutput => ({
  id: "role-1",
  guildId: "guild-1",
  name: "Raid Team",
  color: null,
  permissions: [],
  ...overrides,
});
export const createChatMember = (overrides: Partial<MemberResponseDto> = {}) =>
  ({
    id: 1,
    userId: "user-1",
    guildId: "guild-1",
    type: "USER",
    name: "Hero",
    active: true,
    roles: [],
    updatedAt: "2026-01-01T10:00:00.000Z",
    ...overrides,
  }) satisfies MemberResponseDto;

export const createChatReadyRoom = (
  overrides: Partial<
    Extract<PartyReadyRoomProjection, { viewer: "PARTICIPANT" }>
  > = {},
): Extract<PartyReadyRoomProjection, { viewer: "PARTICIPANT" }> => ({
  schemaVersion: 3,
  notificationId: "room-1",
  organizerDiscordId: "organizer",
  organizerCharacter: {
    accountId: "organizer-account",
    characterId: "organizer-character",
    icon: "organizer.gif",
    lvl: 200,
    nick: "Leader",
    prof: "w",
  },
  guildIds: ["guild-1"],
  world: "Fobos",
  status: "ACTIVE",
  revision: 2,
  createdAt: "2026-07-21T10:00:00.000Z",
  updatedAt: "2026-07-21T10:00:00.000Z",
  expiresAt: "2099-07-21T10:30:00.000Z",
  viewer: "PARTICIPANT",
  participants: {
    "participant-1": {
      participantId: "participant-1",
      discordId: "participant",
      character: {
        accountId: "account-1",
        characterId: "101",
        icon: "hero.gif",
        lvl: 190,
        nick: "Hero",
        prof: "m",
      },
      partyPresence: "OUTSIDE",
      createdAt: "2026-07-21T10:00:00.000Z",
      updatedAt: "2026-07-21T10:00:00.000Z",
    },
  },
  ...overrides,
});
