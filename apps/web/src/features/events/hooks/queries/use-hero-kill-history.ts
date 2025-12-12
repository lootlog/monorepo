export interface KillParticipantMember {
  id: number;
  name: string;
  avatar: string | null;
  userId: string;
}

export interface KillParticipant {
  id: string;
  memberId: number;
  mapName: string;
  points: number;
  basePoints: number;
  appliedMultiplier: number;
  timeOnMapSeconds: number;
  afkPercentage: number;
  wasPresent: boolean;
  member: KillParticipantMember;
}

export interface HeroKillHeroNpc {
  id: string;
  npcId: number | null;
  npcName: string;
  npcIcon: string | null;
}

export interface HeroKill {
  id: string;
  heroNpcId: string;
  killedAt: string;
  minSpawnTimeAtKill: string;
  maxSpawnTimeAtKill: string;
  isManualClose: boolean;
  heroNpc: HeroKillHeroNpc;
  participants: KillParticipant[];
}

export interface KillHistoryResponse {
  data: HeroKill[];
  nextCursor: string | null;
}
