import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { useChatStore } from "@/store/chat.store";
import {
  sendRequest,
  notificationRequest,
  render,
  getEditor,
  createSentMessageResponse,
} from "./chat-input.fixtures";
import { ChatInput } from "./chat-input";

describe("ChatInput commands and compose modes", () => {
  it("shows slash command suggestions and inserts the selected command", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("/g");

    expect(screen.getByText("Utwórz zbiórkę")).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "@Raid Team" }),
    ).not.toBeInTheDocument();

    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(useChatStore.getState().draftsByGuild["guild-1"]).toBe("/grp ");
    });
    expect(editor.textContent).toBe("");
  });

  it("hides /grp as soon as it is typed, with the space after it", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);
    const editor = getEditor();
    await user.click(editor);
    await user.paste("/grp");

    expect(editor.textContent).toBe("");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.paste(" hydra");

    expect(editor.textContent).toBe("hydra");
    expect(useChatStore.getState().draftsByGuild["guild-1"]).toBe("/grp hydra");
  });

  it("does not show command suggestions for bang notifications", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("!abc");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("hides the notification prefix and sends the text after it", async () => {
    notificationRequest.mockResolvedValue(
      Response.json({ guildIds: ["guild-1"], notificationId: "n-1" }),
    );
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);
    const editor = getEditor();
    await user.click(editor);
    await user.paste("!alarm");

    expect(editor.textContent).toBe("alarm");
    expect(document.getSelection()?.focusOffset).toBe("alarm".length);

    fireEvent.keyDown(editor, { key: "Enter" });

    await waitFor(() => expect(notificationRequest).toHaveBeenCalledOnce());

    const body = JSON.parse(
      String(notificationRequest.mock.calls[0]?.[1]?.body),
    );

    expect(body.message).toBe("alarm");
  });

  it("leaves the notification with Backspace at the start and keeps the text", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);
    const editor = getEditor();
    await user.click(editor);
    await user.paste("!alarm");

    const textNode = editor.querySelector("[data-lexical-text]")?.firstChild;
    const selection = document.getSelection();

    if (!(textNode instanceof Text) || !selection)
      throw new Error("Expected text selection");
    selection.setBaseAndExtent(textNode, 0, textNode, 0);
    fireEvent(document, new Event("selectionchange"));
    fireEvent.keyDown(editor, { key: "Backspace" });

    await waitFor(() => {
      expect(useChatStore.getState().draftsByGuild["guild-1"]).toBe("alarm");
    });
  });

  it("switches the mode from the mode menu, keeping the text and marking the current mode", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);
    const editor = getEditor();
    await user.click(editor);
    await user.paste("alarm");

    await user.click(screen.getByRole("button", { name: "Tryb: Wiadomość" }));
    await user.click(
      await screen.findByRole("button", { name: /^Powiadomienie/ }),
    );

    expect(useChatStore.getState().draftsByGuild["guild-1"]).toBe("!alarm");
    expect(editor.textContent).toBe("alarm");
    await waitFor(() => expect(editor).toHaveFocus());
    expect(
      screen.queryByRole("group", { name: "Tryb wysyłania" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Tryb: Powiadomienie" }),
    );

    expect(
      await screen.findByRole("button", { name: /^Powiadomienie/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^Wiadomość/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(screen.getByRole("button", { name: /^Zbiórka/ }));

    expect(useChatStore.getState().draftsByGuild["guild-1"]).toBe("/grp alarm");
  });

  it("starts later entries in the mode picked from the menu until Backspace leaves it for one entry", async () => {
    sendRequest.mockImplementation(async () =>
      Response.json(createSentMessageResponse()),
    );
    notificationRequest.mockResolvedValue(
      Response.json({ guildIds: ["guild-1"], notificationId: "n-1" }),
    );
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);
    const editor = getEditor();

    await user.click(screen.getByRole("button", { name: "Tryb: Wiadomość" }));
    await user.click(
      await screen.findByRole("button", { name: /^Powiadomienie/ }),
    );
    await user.paste("alarm");
    fireEvent.keyDown(editor, { key: "Enter" });

    await waitFor(() => expect(notificationRequest).toHaveBeenCalledOnce());
    await waitFor(() => expect(editor.textContent).toBe(""));
    expect(
      screen.getByRole("button", { name: "Tryb: Powiadomienie" }),
    ).toBeInTheDocument();

    await user.click(editor);
    fireEvent.keyDown(editor, { key: "Backspace" });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Tryb: Wiadomość" }),
      ).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Tryb: Wiadomość" }));
    expect(
      await screen.findByRole("button", { name: /^Powiadomienie/ }),
    ).toHaveTextContent("domyślny");
    expect(
      screen.getByRole("button", { name: /^Wiadomość/ }),
    ).not.toHaveTextContent("domyślny");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(editor).toHaveFocus());

    await user.paste("hello");
    fireEvent.keyDown(editor, { key: "Enter" });

    await waitFor(() => expect(sendRequest).toHaveBeenCalledTimes(2));
    expect(notificationRequest).toHaveBeenCalledOnce();
    expect(
      JSON.parse(String(sendRequest.mock.calls[1]?.[1]?.body)),
    ).toMatchObject({ message: "hello", type: "NORMAL" });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Tryb: Powiadomienie" }),
      ).toBeInTheDocument(),
    );
  });

  it("opens command suggestions for a slash typed into an empty default notification", async () => {
    useChatStore.getState().setDefaultComposeMode("notification");
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);
    const editor = getEditor();
    await user.click(editor);
    await user.paste("/g");

    expect(screen.getByText("Utwórz zbiórkę")).toBeInTheDocument();
    expect(useChatStore.getState().draftsByGuild["guild-1"]).toBe("/g");
  });

  it("operates the mode menu from the keyboard without keys reaching the game", async () => {
    const user = userEvent.setup();
    const windowKeyDownHandler = vi.fn<(event: KeyboardEvent) => void>();
    window.addEventListener("keydown", windowKeyDownHandler);
    render(<ChatInput selectedGuildId="guild-1" />);
    const editor = getEditor();
    await user.click(editor);
    await user.paste("alarm");

    screen.getByRole("button", { name: "Tryb: Wiadomość" }).focus();
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Wiadomość/ })).toHaveFocus(),
    );

    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(useChatStore.getState().draftsByGuild["guild-1"]).toBe("/grp alarm");
    await waitFor(() => expect(editor).toHaveFocus());

    screen.getByRole("button", { name: "Tryb: Zbiórka" }).focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("group", { name: "Tryb wysyłania" });
    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(
        screen.queryByRole("group", { name: "Tryb wysyłania" }),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(editor).toHaveFocus());
    expect(useChatStore.getState().draftsByGuild["guild-1"]).toBe("/grp alarm");
    expect(windowKeyDownHandler).not.toHaveBeenCalled();

    window.removeEventListener("keydown", windowKeyDownHandler);
  });

  it("does not bring the hidden prefix back as text on undo", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);
    const editor = getEditor();
    await user.click(editor);
    await user.paste("!alarm");
    await waitFor(() => expect(editor.textContent).toBe("alarm"));

    await user.keyboard("{Control>}z{/Control}");

    expect(editor.textContent).toBe("alarm");
    expect(useChatStore.getState().draftsByGuild["guild-1"]).toBe("!alarm");
  });
});
