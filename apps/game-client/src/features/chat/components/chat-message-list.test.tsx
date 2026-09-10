import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createChatTestWrapper } from "../chat-test-wrapper";
import { createChatMessage } from "../chat-test-fixtures";
import type { ChatRenderableMessage } from "../chat.helpers";
import { ChatMessageList } from "./chat-message-list";

const rows = (ids: string[]): ChatRenderableMessage[] =>
  ids.map((id) => ({
    kind: "message",
    key: id,
    message: createChatMessage({ id, message: `Public fixture ${id}` }),
  }));
const props = {
  ariaLabel: "Chat messages",
  emptyStateTitle: "No messages",
  guildNamesById: { "guild-1": "Synthetic organization" },
  membersByGuildId: {},
  mentionContextsByGuildId: {},
  onReplyToMessage: () => {},
  selectedGuildId: "guild-1",
};

describe("chat transcript rendering", () => {
  it("renders the empty state without announcing an empty live transcript", () => {
    render(<ChatMessageList {...props} renderables={[]} />, {
      wrapper: createChatTestWrapper().wrapper,
    });
    expect(screen.getByText("No messages")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
  it("keeps incoming and retained messages in source order, removing evicted entries", () => {
    const view = render(
      <ChatMessageList {...props} renderables={rows(["one", "two"])} />,
      { wrapper: createChatTestWrapper().wrapper },
    );
    view.rerender(
      <ChatMessageList {...props} renderables={rows(["two", "three"])} />,
    );
    expect(screen.queryByText("Public fixture one")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining("Public fixture two"),
      expect.stringContaining("Public fixture three"),
    ]);
    expect(screen.getByRole("list")).toHaveAttribute("aria-live", "off");
  });
  it("does not mark messages read when the transcript is inactive", () => {
    const onMessagesSeen = vi.fn();
    render(
      <ChatMessageList
        {...props}
        renderables={rows(["one"])}
        isActive={false}
        onMessagesSeen={onMessagesSeen}
      />,
      { wrapper: createChatTestWrapper().wrapper },
    );
    expect(onMessagesSeen).not.toHaveBeenCalled();
  });
});
