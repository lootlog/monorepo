import type { Npcs } from "@lootlog/margonem/game-events";
import type { DetectorTypeSettings } from "@lootlog/schema/account-preferences";

export type EventNpc = Npcs[0];

export interface ProcessedNpcSettings {
  settings: DetectorTypeSettings;
  icon: string;
  autoSendNotification: boolean;
  guildIds: string[];
}
