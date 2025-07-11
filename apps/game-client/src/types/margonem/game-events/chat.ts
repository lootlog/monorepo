export type ChatChannelKey = "system";

export type ChatEventMsg = {
  id: number;
  msg: string;
  style: number;
  ts: number;
};

export type ChatEventChannel = {
  archivedIds: string[];
  msg: ChatEventMsg[];
};

export type ChatEvent = {
  channels: Record<ChatChannelKey, ChatEventChannel>;
};
