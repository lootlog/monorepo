import { useEffectEvent } from "react";
import type { GameEvent } from "@/types/margonem/game-events/game-event";
import { type PartyMember, usePartyStore } from "@/store/party.store";

function parsePartyMembersFromEvent(
  members: Record<
    string,
    {
      id: number;
      nick: string;
      icon: string;
      commander?: number;
      account: number;
    }
  >,
): PartyMember[] {
  return Object.values(members).map((m) => ({
    id: m.id,
    nick: m.nick,
    icon: m.icon,
    leader: m.commander === 1,
    hp: [0, 0],
    profession: null,
    accountId: m.account,
  }));
}

function parsePartyMembersFromGame(
  membersMap: Map<
    number,
    {
      id: number;
      nick: string;
      icon: string;
      leader: boolean;
      hp: [number, number];
      profession: string | null;
      accountId: number;
    }
  >,
): PartyMember[] {
  return Array.from(membersMap.values()).map((m) => ({
    id: m.id,
    nick: m.nick,
    icon: m.icon,
    leader: m.leader,
    hp: m.hp,
    profession: m.profession,
    accountId: m.accountId,
  }));
}

export const usePartyHandler = () => {
  const setMembers = usePartyStore((s) => s.setMembers);
  const clearParty = usePartyStore((s) => s.clearParty);

  const handlePartyEvent = useEffectEvent((event: GameEvent) => {
    if (event.party === undefined) return;

    const members = event.party.members;
    if (!members || Object.keys(members).length === 0) {
      clearParty();
      return;
    }

    const parsed = parsePartyMembersFromEvent(members);
    setMembers(parsed);
  });

  const handleInitialPartyDetection = useEffectEvent(() => {
    try {
      const membersMap = window.Engine?.party?.getMembers?.();
      if (!membersMap || membersMap.size === 0) {
        clearParty();
        return;
      }

      const parsed = parsePartyMembersFromGame(membersMap);
      setMembers(parsed);
    } catch (error) {
      console.warn("Failed to get initial party members:", error);
    }
  });

  return { handlePartyEvent, handleInitialPartyDetection };
};
