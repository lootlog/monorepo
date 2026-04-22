import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageType } from "@/api/chat.api";
import { ChatReplyPreview } from "./chat-reply-preview";

describe("ChatReplyPreview", () => {
  it("keeps width-constrained layout classes on the card content", () => {
    render(
      <ChatReplyPreview
        reply={{
          senderNick: "VeryLongReplySenderNick",
          message:
            "A very long reply snippet that should stay inside the preview card without stretching it",
          type: MessageType.NORMAL,
        }}
        onClear={vi.fn()}
      />,
    );

    const sender = screen.getByText("VeryLongReplySenderNick");
    const content = sender.parentElement;
    const root = content?.parentElement;
    const snippet = screen.getByText(/A very long reply snippet/);
    const clearButton = screen.getByRole("button");

    expect(root?.className).toContain("ll:box-border");
    expect(content?.className).toContain("ll:w-full");
    expect(content?.className).toContain("ll:max-w-full");
    expect(content?.className).toContain("ll:overflow-hidden");
    expect(sender.className).toContain("ll:truncate");
    expect(snippet.className).toContain("ll:w-full");
    expect(snippet.className).toContain("ll:max-w-full");
    expect(clearButton.className).toContain("ll:shrink-0");
  });

  it("does not bubble the clear button click", () => {
    const onClick = vi.fn();
    const onClear = vi.fn();

    render(
      <ChatReplyPreview
        reply={{
          senderNick: "ReplySender",
          message: "Reply body",
          type: MessageType.NORMAL,
        }}
        onClick={onClick}
        onClear={onClear}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
});
