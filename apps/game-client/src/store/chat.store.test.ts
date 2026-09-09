import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { storageKey } from "@/lib/storage-key";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getSelectedChatGuildId,
  useChatStore,
  type ChatReplyDraft,
} from "./chat.store";

beforeEach(() => useChatStore.setState(useChatStore.getInitialState(), true));
const reply = (guildId: string): ChatReplyDraft => ({
  guildId,
  messageId: "message",
  message: "Help",
  senderNick: "Player",
  type: "NOTIFICATION",
});
describe("organization composer state", () => {
  it("preserves the prior per-character top selector and routes reply focus through that selector", () => {
    setTestRuntimeGame({
      hero: {
        accountId: "migration-account",
        characterId: "migration-character",
      },
    });
    const key = storageKey(
      "ll:chat:selected-guild:migration-account:migration-character",
    );
    localStorage.setItem(key, JSON.stringify("old-organization"));
    expect(getSelectedChatGuildId()).toBe("old-organization");
    useChatStore.getState().setSelectedInputGuildIds(["command-target"]);
    useChatStore.getState().setReplyDraft(reply("reply-organization"));
    expect(getSelectedChatGuildId()).toBe("reply-organization");
    expect(useChatStore.getState().selectedInputGuildIds).toEqual([
      "command-target",
    ]);
    localStorage.removeItem(key);
  });
  it("keeps independent drafts and replies through presentation changes and clears only the submitted reply", () => {
    const state = useChatStore.getState();
    state.setDraft("a", "First draft");
    state.setReplyDraft(reply("a"));
    state.setDraft("b", "Second draft");
    state.setReplyDraft(reply("b"));
    state.toggleIntegratedMode();
    state.clearReplyDraft("a");
    expect(useChatStore.getState().draftsByGuild).toEqual({
      a: "First draft",
      b: "Second draft",
    });
    expect(useChatStore.getState().replyDraftsByGuild.a).toBeUndefined();
    expect(useChatStore.getState().replyDraftsByGuild.b).toEqual(reply("b"));
  });
  it("appends a mention without overwriting a draft and refuses additions exceeding the limit", () => {
    const state = useChatStore.getState();
    state.setDraft("a", "Help");
    state.insertMention("a", "@Player");
    expect(useChatStore.getState().draftsByGuild.a).toBe("Help @Player ");
    expect(useChatStore.getState().focusRequest?.guildId).toBe("a");
    state.setDraft("a", "x".repeat(128));
    state.insertMention("a", "@Player");
    expect(useChatStore.getState().draftsByGuild.a).toHaveLength(128);
  });
});
