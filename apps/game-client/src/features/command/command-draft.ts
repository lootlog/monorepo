import { useChatStore } from "@/store/chat.store";

export const COMMAND_DRAFT_KEY = "command";

export const clearCommandDraft = () =>
  useChatStore.getState().clearDraft(COMMAND_DRAFT_KEY);
