import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageType } from "@/api/chat.api";
import { ChatReplyPreview } from "./chat-reply-preview";

describe("ChatReplyPreview", () => {
  it("does not bubble the clear button click", () => {
    const onClick = vi.fn<() => void>();
    const onClear = vi.fn<() => void>();

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

    fireEvent.click(screen.getByRole("button", { name: "Anuluj odpowiedź" }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
});
