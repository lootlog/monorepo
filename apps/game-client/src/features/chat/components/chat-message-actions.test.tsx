import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatMessage } from "./chat-message";
import { ChatReplyPreview } from "./chat-reply-preview";
import { createChatMessage } from "../chat-test-fixtures";
import { createChatTestWrapper } from "../chat-test-wrapper";

describe("chat message actions", () => {
  it("exposes reply and mention without a context click, and existing moderation through More", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    const onReply = vi.fn();
    const onMention = vi.fn();
    render(
      <ChatMessage
        all={false}
        guildName="Guild"
        message={createChatMessage({ canEdit: true, canDelete: true })}
        onReply={onReply}
        onMention={onMention}
      />,
      { wrapper: createChatTestWrapper().wrapper },
    );
    await user.click(screen.getByRole("button", { name: "Odpowiedz" }));
    await user.click(screen.getByRole("button", { name: "Wspomnij autora" }));
    expect(onReply).toHaveBeenCalledTimes(1);
    expect(onMention).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: "Kopiuj wiadomość" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Więcej akcji" }));
    expect(
      screen.getByRole("menuitem", { name: "Kopiuj wiadomość" }),
    ).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Edytuj" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Usuń" })).toBeVisible();
    await user.click(
      screen.getByRole("menuitem", { name: "Kopiuj wiadomość" }),
    );
    expect(writeText).toHaveBeenCalledWith(createChatMessage().message);
  });

  it("opens the original reply with keyboard and clears independently", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onClear = vi.fn();
    render(
      <ChatReplyPreview
        reply={{ senderNick: "Hero", message: "Help", type: "NORMAL" }}
        onClick={onClick}
        onClear={onClear}
      />,
    );
    await user.tab();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Anuluj odpowiedź" }));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
