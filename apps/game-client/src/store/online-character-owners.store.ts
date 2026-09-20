import { isEqual, isNotNil } from "es-toolkit";
import { getCharacterIdentityKey } from "@/lib/character-identity-key";
import { create } from "zustand";
import type {
  PlayerPresence,
  PlayerPresenceResponse,
} from "@/lib/online-players-presence";
import type { MemberSummaryResponseDtoOutput } from "@lootlog/client/main";

export type GuildMembersByUserId =
  | Record<string, MemberSummaryResponseDtoOutput>
  | undefined;

export type OnlineCharacterOwner = {
  accountId: string;
  characterId: string;
  guildMemberName?: string;
  playerName: string;
  userId: string;
};

export type OnlineCharacterOwnersStatus =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "forbidden";

type OnlineCharacterOwnersState = {
  ownersByCharacterKey: Record<string, OnlineCharacterOwner | undefined>;
  status: OnlineCharacterOwnersStatus;
  clearOwners: () => void;
  getOwner: (
    accountId: string,
    characterId: string,
  ) => OnlineCharacterOwner | undefined;
  removePresence: (presence: PlayerPresence) => void;
  setError: () => void;
  setForbidden: () => void;
  setGuildMembers: (guildMembersByUserId: GuildMembersByUserId) => void;
  setPresenceResponse: (
    response: PlayerPresenceResponse,
    guildMembersByUserId?: GuildMembersByUserId,
  ) => void;
  setLoading: () => void;
  upsertPresence: (
    presence: PlayerPresence,
    guildMembersByUserId?: GuildMembersByUserId,
  ) => void;
};

function toOwner(
  presence: PlayerPresence,
  guildMembersByUserId?: GuildMembersByUserId,
): OnlineCharacterOwner | null {
  const player = presence.player;

  if (!player?.accountId || !player.characterId) {
    return null;
  }

  return {
    accountId: player.accountId,
    characterId: player.characterId,
    guildMemberName: guildMembersByUserId?.[presence.discordId]?.name,
    playerName: player.name,
    userId: presence.discordId,
  };
}

function withGuildMemberNames(
  ownersByCharacterKey: Record<string, OnlineCharacterOwner | undefined>,
  guildMembersByUserId: GuildMembersByUserId,
) {
  let next = ownersByCharacterKey;

  for (const [key, owner] of Object.entries(ownersByCharacterKey)) {
    if (!owner) continue;

    const guildMemberName = guildMembersByUserId?.[owner.userId]?.name;

    if (owner.guildMemberName === guildMemberName) continue;

    if (next === ownersByCharacterKey) next = { ...ownersByCharacterKey };
    next[key] = { ...owner, guildMemberName };
  }

  return next;
}

export const useOnlineCharacterOwnersStore =
  create<OnlineCharacterOwnersState>()((set, get) => ({
    ownersByCharacterKey: {},
    status: "idle",
    clearOwners: () =>
      set((state) => {
        if (
          state.status === "idle" &&
          Object.keys(state.ownersByCharacterKey).length === 0
        ) {
          return state;
        }

        return { ownersByCharacterKey: {}, status: "idle" };
      }),
    getOwner: (accountId, characterId) =>
      get().ownersByCharacterKey[
        getCharacterIdentityKey(accountId, characterId)
      ],
    removePresence: (presence) =>
      set((state) => {
        const player = presence.player;

        if (!player?.accountId || !player.characterId) {
          const ownersByCharacterKey = Object.fromEntries(
            Object.entries(state.ownersByCharacterKey).filter(
              ([, owner]) => owner?.userId !== presence.discordId,
            ),
          );

          if (
            Object.keys(ownersByCharacterKey).length ===
            Object.keys(state.ownersByCharacterKey).length
          ) {
            return state;
          }

          return { ownersByCharacterKey };
        }

        const key = getCharacterIdentityKey(
          player.accountId,
          player.characterId,
        );

        if (!state.ownersByCharacterKey[key]) return state;

        const { [key]: _removed, ...ownersByCharacterKey } =
          state.ownersByCharacterKey;

        return { ownersByCharacterKey };
      }),
    setError: () => set({ ownersByCharacterKey: {}, status: "error" }),
    setForbidden: () => set({ ownersByCharacterKey: {}, status: "forbidden" }),
    setGuildMembers: (guildMembersByUserId) =>
      set((state) => {
        const ownersByCharacterKey = withGuildMemberNames(
          state.ownersByCharacterKey,
          guildMembersByUserId,
        );

        return ownersByCharacterKey === state.ownersByCharacterKey
          ? state
          : { ownersByCharacterKey };
      }),
    setPresenceResponse: (response, guildMembersByUserId) =>
      set({
        ownersByCharacterKey: Object.fromEntries(
          Object.values(response)
            .flat()
            .map((presence) => toOwner(presence, guildMembersByUserId))
            .filter(isNotNil)
            .map((owner) => [
              getCharacterIdentityKey(owner.accountId, owner.characterId),
              owner,
            ]),
        ),
        status: "success",
      }),
    setLoading: () => set({ status: "loading" }),
    upsertPresence: (presence, guildMembersByUserId) =>
      set((state) => {
        const owner = toOwner(presence, guildMembersByUserId);

        if (!owner) return state;

        const key = getCharacterIdentityKey(owner.accountId, owner.characterId);

        if (isEqual(state.ownersByCharacterKey[key], owner)) return state;

        return {
          ownersByCharacterKey: {
            ...state.ownersByCharacterKey,
            [key]: owner,
          },
        };
      }),
  }));
