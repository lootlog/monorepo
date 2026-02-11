export interface ChatController {
  init(): void;
  getChatInputWrapper(): any;
  sendMessage(text: string): void;
  
  // Helpers
  setPrivateMessageProcedure(nick: string): void;
  
  [key: string]: any;
}
