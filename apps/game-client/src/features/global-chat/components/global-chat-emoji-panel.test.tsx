import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGlobalChatStore } from "@/store/global-chat.store";
import { GlobalChatEmojiPanel } from "./global-chat-emoji-panel";

describe("GlobalChatEmojiPanel", () => {
  beforeEach(() => {
    useGlobalChatStore.setState(useGlobalChatStore.getInitialState(), true);
  });

  it("inserts the first search result on Enter and remembers it as recent", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<GlobalChatEmojiPanel onPick={onPick} />);

    await user.type(screen.getByRole("textbox"), "ogien{Enter}");

    expect(onPick).toHaveBeenCalledWith("🔥");
    expect(useGlobalChatStore.getState().recentEmoji).toEqual(["🔥"]);
  });
});
