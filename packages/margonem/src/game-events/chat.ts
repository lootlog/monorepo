export type ChatChannelKey =
  | "system"
  | "global"
  | "clan"
  | "local"
  | "party"
  | "trade"
  | "personal"
  | "commercial";

export type ChatEventMsg = {
  id: number;
  msg?: string;
  code?: string;
  sender?: number;
  related?: number[];
  style?: number;
  ts: number;
};

export type ChatEventChannel = {
  archivedIds: string[];
  msg: ChatEventMsg[];
};

export type ChatEvent = {
  channels: Partial<Record<ChatChannelKey, ChatEventChannel>>;
};
