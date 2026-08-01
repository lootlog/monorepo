import { create } from "zustand";
import { performanceStoreMiddleware } from "@/lib/performance-monitoring/store-middleware";
import type {
  PlayerPresence,
  PlayerPresenceResponse,
} from "@/lib/online-players-presence";
import type { MemberSummaryResponseDtoOutput } from "@lootlog/api-client/models/main/member-summary-response-dto-output";

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

export function getOnlineCharacterOwnerKey(
  accountId: string,
  characterId: string,
): string {
  return `${accountId}:${characterId}`;
}

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
  return Object.fromEntries(
    Object.entries(ownersByCharacterKey).map(([key, owner]) => [
      key,
      owner
        ? {
            ...owner,
            guildMemberName: guildMembersByUserId?.[owner.userId]?.name,
          }
        : owner,
    ]),
  );
}

export const useOnlineCharacterOwnersStore =
  create<OnlineCharacterOwnersState>()(
    performanceStoreMiddleware("online-character-owners", (set, get) => ({
      ownersByCharacterKey: {},
      status: "idle",
      clearOwners: () => set({ ownersByCharacterKey: {}, status: "idle" }),
      getOwner: (accountId, characterId) =>
        get().ownersByCharacterKey[
          getOnlineCharacterOwnerKey(accountId, characterId)
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

          const key = getOnlineCharacterOwnerKey(
            player.accountId,
            player.characterId,
          );
          if (!state.ownersByCharacterKey[key]) return state;

          const { [key]: _removed, ...ownersByCharacterKey } =
            state.ownersByCharacterKey;
          return { ownersByCharacterKey };
        }),
      setError: () => set({ ownersByCharacterKey: {}, status: "error" }),
      setForbidden: () =>
        set({ ownersByCharacterKey: {}, status: "forbidden" }),
      setGuildMembers: (guildMembersByUserId) =>
        set((state) => ({
          ownersByCharacterKey: withGuildMemberNames(
            state.ownersByCharacterKey,
            guildMembersByUserId,
          ),
        })),
      setPresenceResponse: (response, guildMembersByUserId) =>
        set({
          ownersByCharacterKey: Object.fromEntries(
            Object.values(response)
              .flat()
              .map((presence) => toOwner(presence, guildMembersByUserId))
              .filter((owner): owner is OnlineCharacterOwner => Boolean(owner))
              .map((owner) => [
                getOnlineCharacterOwnerKey(owner.accountId, owner.characterId),
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

          return {
            ownersByCharacterKey: {
              ...state.ownersByCharacterKey,
              [getOnlineCharacterOwnerKey(owner.accountId, owner.characterId)]:
                owner,
            },
          };
        }),
    })),
  );
