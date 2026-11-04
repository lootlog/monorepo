import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createChatTestWrapper } from "../chat-test-wrapper";
import { createChatMessage } from "../chat-test-fixtures";
import { dispatchChatScrollToMessage } from "../chat-scroll-to-message";
import type { ChatRenderableMessage } from "../chat.helpers";
import { ChatMessageList } from "./chat-message-list";

const rows = (ids: string[]): ChatRenderableMessage[] =>
  ids.map((id) => ({
    kind: "message",
    key: id,
    message: createChatMessage({ id, message: `Public fixture ${id}` }),
  }));

const history = Array.from({ length: 120 }, (_, index) => `m${index}`);

const queryViewport = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-chat-viewport]")!;

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
  it("keeps a manually scrolled-up viewport in place when a message is appended", () => {
    const view = render(
      <ChatMessageList
        {...props}
        renderables={rows(["one", "two"])}
        position={{ atEnd: true, offset: 0 }}
      />,
      { wrapper: createChatTestWrapper().wrapper },
    );

    const viewport = view.container.querySelector<HTMLElement>(
      "[data-chat-viewport]",
    )!;

    const scrollTo = vi.fn();
    Object.defineProperty(viewport, "scrollTop", {
      value: 120,
      writable: true,
    });
    Object.defineProperty(viewport, "scrollTo", { value: scrollTo });
    fireEvent.wheel(viewport, { deltaY: -100 });

    view.rerender(
      <ChatMessageList
        {...props}
        renderables={rows(["one", "two", "three"])}
        position={{ atEnd: false, messageId: "one", offset: 0 }}
      />,
    );

    expect(scrollTo).not.toHaveBeenCalledWith(
      expect.objectContaining({ top: 0 }),
    );
  });

  it("mounts only the newest page of a long history and reveals older rows near the top", () => {
    const view = render(
      <ChatMessageList {...props} renderables={rows(history)} />,
      { wrapper: createChatTestWrapper().wrapper },
    );

    expect(screen.getByText("Public fixture m119")).toBeInTheDocument();
    expect(screen.queryByText("Public fixture m69")).not.toBeInTheDocument();

    const viewport = queryViewport(view.container);
    Object.defineProperty(viewport, "clientHeight", { value: 300 });
    Object.defineProperty(viewport, "scrollHeight", { value: 4000 });
    Object.defineProperty(viewport, "scrollTop", {
      value: 200,
      writable: true,
    });
    fireEvent.scroll(viewport);

    expect(screen.getByText("Public fixture m69")).toBeInTheDocument();
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(
      history
        .slice(20)
        .map((id) => expect.stringContaining(`Public fixture ${id}`)),
    );
  });
  it("keeps fully revealed history mounted when retention evicts its oldest row", () => {
    const view = render(
      <ChatMessageList {...props} renderables={rows(history)} />,
      { wrapper: createChatTestWrapper().wrapper },
    );

    const viewport = queryViewport(view.container);
    Object.defineProperty(viewport, "clientHeight", { value: 300 });
    Object.defineProperty(viewport, "scrollHeight", { value: 4000 });
    Object.defineProperty(viewport, "scrollTop", { value: 0, writable: true });
    fireEvent.scroll(viewport);
    fireEvent.scroll(viewport);
    expect(screen.getByText("Public fixture m0")).toBeInTheDocument();

    view.rerender(
      <ChatMessageList
        {...props}
        renderables={rows([...history.slice(1), "m120"])}
      />,
    );

    expect(screen.queryByText("Public fixture m0")).not.toBeInTheDocument();
    expect(screen.getByText("Public fixture m1")).toBeInTheDocument();
    expect(screen.getByText("Public fixture m120")).toBeInTheDocument();
  });
  it("mounts an older message outside the window before jumping to it", () => {
    render(<ChatMessageList {...props} renderables={rows(history)} />, {
      wrapper: createChatTestWrapper().wrapper,
    });
    expect(screen.queryByText("Public fixture m3")).not.toBeInTheDocument();

    act(() => dispatchChatScrollToMessage("m3"));

    expect(screen.getByText("Public fixture m3")).toBeInTheDocument();
  });
  it("mounts a restored position that lies before the newest page", () => {
    render(
      <ChatMessageList
        {...props}
        renderables={rows(history)}
        position={{ atEnd: false, messageId: "m10", offset: 0 }}
      />,
      { wrapper: createChatTestWrapper().wrapper },
    );

    expect(screen.getByText("Public fixture m10")).toBeInTheDocument();
    expect(screen.queryByText("Public fixture m9")).not.toBeInTheDocument();
  });
});
