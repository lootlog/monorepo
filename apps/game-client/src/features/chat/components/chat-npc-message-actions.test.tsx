import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ChatNpcMessageActions } from "./chat-npc-message-actions";
import { createChatMessage } from "../chat-test-fixtures";
import { createChatTestWrapper } from "../chat-test-wrapper";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { getSelectedChatGuildId, useChatStore } from "@/store/chat.store";

const npc = {
  id: 10,
  name: "Hunter",
  icon: "npc.png",
  x: 42,
  y: 18,
  location: "Ruins",
  lvl: 120,
  prof: "m",
  type: 1,
  wt: 80,
  world: "tempest",
};
beforeEach(() => {
  setTestRuntimeGame({ world: "tempest" });
  useChatStore.setState({ draftsByGuild: {}, focusRequest: null });
});

describe("NPC quick actions", () => {
  it.each([undefined, "other"])(
    "disables world-dependent actions for source world %s",
    (world) => {
      render(
        <ChatNpcMessageActions
          message={createChatMessage({ type: "NPC", npc: { ...npc, world } })}
        />,
        { wrapper: createChatTestWrapper().wrapper },
      );
      expect(
        screen.getByRole("button", { name: "Zbierz grupę" }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Przygotuj wezwanie pomocy" }),
      ).toBeDisabled();
      expect(
        screen.queryByRole("button", { name: "Kopiuj lokalizację" }),
      ).not.toBeInTheDocument();
    },
  );

  it("prepares source-location help for the source organization, preserving an existing draft", () => {
    render(
      <ChatNpcMessageActions
        message={createChatMessage({ type: "NPC", npc })}
      />,
      { wrapper: createChatTestWrapper().wrapper },
    );
    useChatStore.getState().setDraft("guild-1", "Unfinished message");
    const button = screen.getByRole("button", {
      name: "Przygotuj wezwanie pomocy",
    });
    fireEvent.click(button);
    expect(useChatStore.getState().draftsByGuild["guild-1"]).toBe(
      "Unfinished message",
    );
    expect(useChatStore.getState().focusRequest).toBeNull();
    useChatStore.getState().setDraft("guild-1", "");
    fireEvent.click(button);
    expect(useChatStore.getState().draftsByGuild["guild-1"]).toBe(
      "!Potrzebuję pomocy przy Hunter! Ruins (42, 18)",
    );
    expect(getSelectedChatGuildId()).toBe("guild-1");
    expect(useChatStore.getState().focusRequest?.guildId).toBe("guild-1");
  });
});
