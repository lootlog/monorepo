import { useChatStore } from "@/store/chat.store";

/** The console's slot among the chat drafts; it never collides with a guild id. */
export const COMMAND_DRAFT_KEY = "command";

export const clearCommandDraft = () =>
  useChatStore.getState().setDraft(COMMAND_DRAFT_KEY, "");
