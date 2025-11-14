export type ChatController = {
  getChatInputWrapper: () => ChatInputWrapper;
};
export type ChatInputWrapper = {
  ogSetLinkedItem: ((hId: string) => void) | null;
  setLinkedItem: (hId: string) => void;

  ogSetPrivateMessageProcedure: ((nick: string) => void) | null;
  setPrivateMessageProcedure: (nick: string) => void;
};
