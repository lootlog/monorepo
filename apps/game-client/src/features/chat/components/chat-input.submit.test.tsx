import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Capability } from "@lootlog/schema/permissions";
import { expect, it } from "vitest";
import { useChatStore } from "@/store/chat.store";
import {
  chatInputFixture,
  sendRequest,
  notificationRequest,
  clearRequest,
  chatQueryKey,
  render,
  getEditor,
  createSentMessageResponse,
} from "./chat-input.fixtures";
import { ChatInput } from "./chat-input";

describe("ChatInput submission", () => {
  it("ignores repeated notification submits until orchestration finishes", async () => {
    const deferred = Promise.withResolvers<Response>();
    notificationRequest.mockReturnValue(deferred.promise);
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);
    const editor = getEditor();
    await user.click(editor);
    await user.paste("!alarm");

    fireEvent.keyDown(editor, { key: "Enter" });
    fireEvent.keyDown(editor, { key: "Enter" });

    await waitFor(() => expect(notificationRequest).toHaveBeenCalledTimes(1));
    expect(editor).toHaveAttribute("tabindex", "-1");

    deferred.resolve(
      Response.json({
        guildIds: ["guild-1"],
        notificationId: "notification-1",
      }),
    );
    await waitFor(() => expect(editor).toHaveAttribute("tabindex", "0"));
    expect(editor.textContent).toBe("");
  });

  it("retains the notification draft without posting chat after a 429 response", async () => {
    notificationRequest.mockResolvedValue(
      Response.json({ retryAfterMs: 1_000 }, { status: 429 }),
    );
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);
    const editor = getEditor();
    await user.click(editor);
    await user.paste("!alarm");
    fireEvent.keyDown(editor, { key: "Enter" });

    await waitFor(() => expect(notificationRequest).toHaveBeenCalledTimes(1));
    expect(sendRequest).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(chatInputFixture.messages).toContain(
        "Wysyłasz zbyt szybko. Spróbuj ponownie za chwilę.",
      ),
    );
    expect(editor.textContent).toBe("alarm");
    expect(useChatStore.getState().draftsByGuild["guild-1"]).toBe("!alarm");
  });

  it("does not send a notification without text", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);
    const editor = getEditor();
    await user.click(editor);
    await user.paste("! ");
    fireEvent.keyDown(editor, { key: "Enter" });

    await Promise.resolve();
    expect(notificationRequest).not.toHaveBeenCalled();
    expect(sendRequest).not.toHaveBeenCalled();
    expect(useChatStore.getState().draftsByGuild["guild-1"]).toBe("! ");
  });

  it("shows the clear chat command only for admin or owner permissions", async () => {
    const user = userEvent.setup();
    chatInputFixture.guildPermissions = [Capability.ADMIN];
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("/c");

    expect(screen.getByText("Wyczyść czat")).toBeInTheDocument();
  });

  it("does not show the clear chat command for regular members", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("/c");

    expect(screen.queryByText("Wyczyść czat")).not.toBeInTheDocument();
  });

  it("opens a confirmation popover for /clr and clears the guild chat after confirming", async () => {
    const user = userEvent.setup();
    chatInputFixture.guildPermissions = [Capability.OWNER];
    clearRequest.mockResolvedValue(Response.json({ success: true }));
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("/clr");
    await user.keyboard("{Enter}");
    await user.keyboard("{Enter}");

    expect(screen.getByText("Wyczyścić czat?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anuluj" })).toHaveFocus();
    expect(sendRequest).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(screen.queryByText("Wyczyścić czat?")).not.toBeInTheDocument();
    await waitFor(() => expect(editor).toHaveFocus());
    expect(clearRequest).not.toHaveBeenCalled();
    expect(editor.textContent?.trim()).toBe("/clr");

    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Wyczyść" }));

    await waitFor(() => {
      expect(clearRequest).toHaveBeenCalledOnce();
      expect(String(clearRequest.mock.calls[0]?.[0])).toBe(
        "https://api.example.test/guilds/guild-1/chat-messages",
      );
    });
    expect(chatInputFixture.queryClient.getQueryData(chatQueryKey)).toEqual([]);
    expect(editor.textContent).toBe("");
    expect(screen.queryByText("Wyczyścić czat?")).not.toBeInTheDocument();
  });

  it("reports a failed chat clear and keeps the messages", async () => {
    const user = userEvent.setup();
    chatInputFixture.guildPermissions = [Capability.OWNER];
    clearRequest.mockResolvedValue(Response.json({}, { status: 500 }));
    render(<ChatInput selectedGuildId="guild-1" />);

    const chatMessages =
      chatInputFixture.queryClient.getQueryData(chatQueryKey);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("/clr");
    await user.keyboard("{Enter}");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Wyczyść" }));

    await waitFor(() =>
      expect(chatInputFixture.messages).toContain(
        "Nie udało się wyczyścić czatu. Spróbuj ponownie.",
      ),
    );
    expect(clearRequest).toHaveBeenCalledOnce();
    expect(chatInputFixture.queryClient.getQueryData(chatQueryKey)).toBe(
      chatMessages,
    );
  });

  it("restores editor focus after sending a message", async () => {
    const user = userEvent.setup();
    sendRequest.mockResolvedValue(Response.json(createSentMessageResponse()));
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("hello");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(sendRequest).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(editor).toHaveFocus();
    });
    expect(editor.textContent).toBe("");
  });

  it("preserves the draft and restores focus after a send error", async () => {
    const user = userEvent.setup();
    sendRequest.mockRejectedValue(new Error("send failed"));
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("hello");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(sendRequest).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(editor).toHaveFocus();
    });
    expect(chatInputFixture.messages).toContain(
      "Nie udało się wysłać wiadomości na czat",
    );
    expect(editor.textContent).toBe("hello");
  });
});
