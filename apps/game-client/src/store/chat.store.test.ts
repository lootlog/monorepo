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
});

it("migrates the saved filter once while retaining preferences, then persists later selections", async () => {
  const name = storageKey("ll:chat:state");
  localStorage.setItem(
    name,
    JSON.stringify({
      version: 1,
      state: {
        chatFilter: "normal",
        isNotificationEnabled: false,
        selectedInputGuildIds: ["a"],
      },
    }),
  );
  await useChatStore.persist.rehydrate();
  expect(useChatStore.getState().chatFilter).toBe("all");
  expect(useChatStore.getState().isNotificationEnabled).toBe(false);
  expect(useChatStore.getState().selectedInputGuildIds).toEqual(["a"]);
  useChatStore.getState().setDraft("a", "Keep this draft");
  useChatStore.getState().setChatFilter("reports");
  await useChatStore.persist.rehydrate();
  expect(useChatStore.getState().chatFilter).toBe("reports");
  expect(useChatStore.getState().draftsByGuild.a).toBe("Keep this draft");
  localStorage.removeItem(name);
});

it("shows filters by default and persists toggling them off and on", async () => {
  expect(useChatStore.getState().filtersVisible).toBe(true);
  useChatStore.getState().setChatFilter("reports");
  useChatStore.getState().toggleFiltersVisible();
  await useChatStore.persist.rehydrate();
  expect(useChatStore.getState().filtersVisible).toBe(false);
  expect(
    JSON.parse(localStorage.getItem(storageKey("ll:chat:state")) ?? "null")
      .state.filtersVisible,
  ).toBe(false);
  expect(useChatStore.getState().chatFilter).toBe("all");
  useChatStore.getState().toggleFiltersVisible();
  await useChatStore.persist.rehydrate();
  expect(useChatStore.getState().filtersVisible).toBe(true);
});
