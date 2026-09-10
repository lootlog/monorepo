import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatMessage } from "./chat-message";
import { ChatReplyPreview } from "./chat-reply-preview";
import { createChatMessage } from "../chat-test-fixtures";
import { createChatTestWrapper } from "../chat-test-wrapper";

describe("chat message actions", () => {
  it.each(["NORMAL", "NOTIFICATION"] as const)(
    "keeps %s message actions in the context menu without inline buttons",
    async (type) => {
      const user = userEvent.setup();
      const writeText = vi.spyOn(navigator.clipboard, "writeText");
      const onReply = vi.fn();
      render(
        <ChatMessage
          all={false}
          guildName="Guild"
          message={createChatMessage({ type, canDelete: true })}
          onReply={onReply}
        />,
        { wrapper: createChatTestWrapper().wrapper },
      );
      expect(screen.queryByRole("button")).not.toBeInTheDocument();

      const message = screen.getByText(
        type === "NOTIFICATION" ? "[P] Hello" : "Hello",
      );

      await user.tab();
      expect(document.activeElement).toContainElement(message);
      await user.keyboard("{Shift>}{F10}{/Shift}");
      await user.click(screen.getByRole("menuitem", { name: "Odpowiedz" }));
      expect(onReply).toHaveBeenCalledTimes(1);
      fireEvent.contextMenu(message);
      await waitFor(() =>
        expect(
          screen.getByRole("menuitem", { name: "Kopiuj wiadomość" }),
        ).toBeVisible(),
      );
      expect(
        screen.queryByRole("menuitem", { name: "Edytuj" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("menuitem", { name: "Wspomnij autora" }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Usuń" })).toBeVisible();
      await user.click(
        screen.getByRole("menuitem", { name: "Kopiuj wiadomość" }),
      );
      expect(writeText).toHaveBeenCalledWith(createChatMessage().message);
    },
  );

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

it("exposes the full compact quote and opens the original with keyboard", async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();
  const message = "Very long quoted message ".repeat(8);
  render(
    <ChatReplyPreview
      variant="compact"
      reply={{ senderNick: "Hero", message, type: "NORMAL" }}
      onClick={onClick}
    />,
  );

  const quote = screen.getByRole("button", {
    name: new RegExp(message.trim()),
  });

  expect(quote).toHaveAttribute("title", `Hero: ${message}`);
  expect(screen.getByText(message.trim())).toBeInTheDocument();
  await user.tab();
  await user.keyboard("{Enter}");
  expect(onClick).toHaveBeenCalledTimes(1);
});
