export interface KillParticipantMember {
  id: number;
  name: string;
  avatar: string | null;
  userId: string;
}

export interface ParticipantMapData {
  mapId: string;
  mapName: string;
  assignedAt: string;
  unassignedAt: string | null;
  assignmentDurationSeconds: number;
  presenceTimeSeconds: number;
  afkTimeSeconds: number;
}

export interface KillParticipant {
  id: string;
  memberId: number;
  mapName: string;
  points: number;
  basePoints: number;
  appliedMultiplier: number;
  timeMultiplier: number | null;
  trackersMultiplier: number | null;
  mapsMultiplier: number | null;
  trackingDurationSeconds: number | null;
  timeOnMapSeconds: number;
  afkPercentage: number;
  wasPresent: boolean;
  member: KillParticipantMember;
  mapData?: ParticipantMapData[];
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
