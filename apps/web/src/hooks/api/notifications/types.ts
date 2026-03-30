export interface NotificationTarget {
  id: string;
  ownerType: "guild" | "user";
  ownerId: string;
  provider: "discord";
  targetType: "channel" | "dm";
  externalId: string;
  displayName: string | null;
  guildName: string | null;
  enabled: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRuleTarget {
  ruleId: string;
  targetId: string;
  target: NotificationTarget;
}

export interface NotificationRule {
  id: string;
  ownerType: "guild" | "user";
  ownerId: string;
  triggerType: "timer_before_spawn" | "npc_spawned" | "watched_item_dropped";
  guildId: string | null;
  world: string | null;
  filters: Record<string, unknown>;
  leadTimeMinutes: number | null;
  dedupeWindowSeconds: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  rulesToTargets?: NotificationRuleTarget[];
}

export interface WatchedItem {
  id: string;
  userId: string;
  itemId: number;
  itemName: string;
  itemIcon: string | null;
  world: string | null;
  ruleId: string | null;
  createdAt: string;
  rule?: NotificationRule | null;
}

export interface DiscordChannel {
  id: string;
  discordGuildId: string;
  channelId: string;
  channelName: string;
  channelType: string;
  cachedAt: string;
}
