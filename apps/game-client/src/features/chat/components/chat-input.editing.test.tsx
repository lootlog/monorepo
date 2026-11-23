import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { useChatStore } from "@/store/chat.store";
import {
  sendRequest,
  render,
  getEditor,
  setPlainEditorSelection,
} from "./chat-input.fixtures";
import { ChatInput } from "./chat-input";

describe("ChatInput editing", () => {
  it("restores draft and reply after the composer unmounts", async () => {
    const user = userEvent.setup();
    const first = render(<ChatInput selectedGuildId="guild-1" />);
    await user.click(getEditor());
    await user.paste("Keep this draft");
    act(() =>
      useChatStore.getState().setReplyDraft({
        guildId: "guild-1",
        messageId: "old-message",
        message: "Help",
        senderNick: "Raider",
        type: "NOTIFICATION",
      }),
    );
    first.unmount();
    render(<ChatInput selectedGuildId="guild-1" />);
    await waitFor(() =>
      expect(getEditor().textContent).toBe("Keep this draft"),
    );
    expect(screen.getByText("[P] Help")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Anuluj odpowiedź" }));
    expect(
      useChatStore.getState().replyDraftsByGuild["guild-1"],
    ).toBeUndefined();
    expect(getEditor().textContent).toBe("Keep this draft");
    await waitFor(() => expect(getEditor()).toHaveFocus());
  });

  it("sanitizes pasted multiline text into a single line with a preserved caret flow", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("linia 1\nlinia 2");

    expect(editor.textContent).toBe("linia 1 linia 2");
  });

  it("cuts selected text through controlled state instead of native contentEditable mutation", async () => {
    const user = userEvent.setup();

    const clipboardData = {
      setData: vi.fn<DataTransfer["setData"]>(),
    };

    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("hello world");

    setPlainEditorSelection({
      editor,
      start: 6,
      end: 11,
    });
    fireEvent.cut(editor, { clipboardData });

    expect(clipboardData.setData).toHaveBeenCalledWith("text/plain", "world");
    await waitFor(() => {
      expect(editor.textContent).toBe("hello ");
    });
  });

  it("deletes the previous word with Ctrl+Backspace", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("hello world");
    await user.keyboard("{Control>}{Backspace}{/Control}");

    await waitFor(() => {
      expect(editor.textContent).toBe("hello ");
    });
  });

  it("preserves a reverse selection when Shift+ArrowRight is pressed", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("hello world");

    const textNode = editor.querySelector("[data-lexical-text]")?.firstChild;
    const selection = document.getSelection();

    expect(textNode).toBeInstanceOf(Text);
    expect(selection).not.toBeNull();

    if (!(textNode instanceof Text) || !selection)
      throw new Error("Expected text selection");
    selection.setBaseAndExtent(textNode, 11, textNode, 6);
    fireEvent(document, new Event("selectionchange"));
    fireEvent.keyDown(editor, { key: "ArrowRight", shiftKey: true });
    fireEvent.keyUp(editor, { key: "ArrowRight", shiftKey: true });

    expect(selection?.isCollapsed).toBe(false);
    expect(selection?.anchorOffset).toBe(11);
    expect(selection?.focusOffset).toBe(6);
  });

  it("deletes reverse selections without collapsing them first", async () => {
    const user = userEvent.setup();

    const clipboardData = {
      setData: vi.fn<DataTransfer["setData"]>(),
    };

    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("hello world");

    const textNode = editor.querySelector("[data-lexical-text]")?.firstChild;
    const selection = document.getSelection();

    expect(textNode).toBeInstanceOf(Text);

    if (!(textNode instanceof Text) || !selection)
      throw new Error("Expected text selection");
    selection.setBaseAndExtent(textNode, 11, textNode, 6);
    fireEvent(document, new Event("selectionchange"));
    fireEvent.cut(editor, { clipboardData });

    expect(clipboardData.setData).toHaveBeenCalledWith("text/plain", "world");
    await waitFor(() => {
      expect(editor.textContent).toBe("hello ");
    });
  });

  it("supports undo and redo through the native platform shortcuts", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("hello");

    await user.keyboard("{Control>}z{/Control}");
    await waitFor(() => {
      expect(editor.textContent).toBe("");
    });

    await user.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
    await waitFor(() => {
      expect(editor.textContent).toBe("hello");
    });
  });

  it("limits pasted composer text to the supported 128 characters", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("a".repeat(140));

    expect(editor.textContent).toBe("a".repeat(128));
  });

  it("does not submit while an IME composition is active", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("zażółć");
    fireEvent.compositionStart(editor);
    fireEvent.keyDown(editor, { key: "Enter", isComposing: true });
    fireEvent.compositionEnd(editor, { data: "ć" });

    expect(sendRequest).not.toHaveBeenCalled();
    expect(editor.textContent).toBe("zażółć");
  });

  it("shows the placeholder again after deleting the editor content to zero", async () => {
    const user = userEvent.setup();
    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    expect(screen.getByText("Wiadomość…")).toBeInTheDocument();

    await user.paste("abc");
    expect(screen.queryByText("Wiadomość…")).not.toBeInTheDocument();

    setPlainEditorSelection({
      editor,
      start: 0,
      end: 3,
    });
    fireEvent.cut(editor, {
      clipboardData: {
        setData: vi.fn<DataTransfer["setData"]>(),
      },
    });

    await waitFor(() => {
      expect(editor.textContent).toBe("");
    });
    expect(screen.getByText("Wiadomość…")).toBeInTheDocument();
  });

  it("stops keyboard events from bubbling outside the editor", async () => {
    const user = userEvent.setup();
    const windowKeyDownHandler = vi.fn<(event: KeyboardEvent) => void>();
    const windowKeyPressHandler = vi.fn<(event: KeyboardEvent) => void>();
    const windowKeyUpHandler = vi.fn<(event: KeyboardEvent) => void>();
    window.addEventListener("keydown", windowKeyDownHandler);
    window.addEventListener("keypress", windowKeyPressHandler);
    window.addEventListener("keyup", windowKeyUpHandler);

    render(<ChatInput selectedGuildId="guild-1" />);

    const editor = getEditor();
    await user.click(editor);
    await user.paste("w");
    fireEvent.keyDown(editor, { key: "w" });
    fireEvent.keyPress(editor, { charCode: 119, key: "w" });
    fireEvent.keyUp(editor, { key: "w" });

    expect(editor.textContent).toBe("w");
    expect(windowKeyDownHandler).not.toHaveBeenCalled();
    expect(windowKeyPressHandler).not.toHaveBeenCalled();
    expect(windowKeyUpHandler).not.toHaveBeenCalled();

    window.removeEventListener("keydown", windowKeyDownHandler);
    window.removeEventListener("keypress", windowKeyPressHandler);
    window.removeEventListener("keyup", windowKeyUpHandler);
  });
});
