import type { Npc } from "src/gateway/types/npc.type";

export class SendNotificationDto {
  guildId: string;
  npc: Npc;
  isGatheringParty?: boolean;
}
