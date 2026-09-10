import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NpcColorEditorPopover } from "./npc-color-editor-popover";

describe("NpcColorEditorPopover", () => {
  it("restores the default color when requested", () => {
    const onReset =
      vi.fn<ComponentProps<typeof NpcColorEditorPopover>["onReset"]>();

    render(
      <NpcColorEditorPopover
        color="#AA5500"
        defaultColor="#F98948"
        npcType="HERO"
        open
        saving={false}
        onOpenChange={vi.fn<
          ComponentProps<typeof NpcColorEditorPopover>["onOpenChange"]
        >()}
        onDraftChange={vi.fn<
          ComponentProps<typeof NpcColorEditorPopover>["onDraftChange"]
        >()}
        onCommit={vi.fn<
          ComponentProps<typeof NpcColorEditorPopover>["onCommit"]
        >()}
        onReset={onReset}
      >
        <button type="button">Hero</button>
      </NpcColorEditorPopover>,
    );

    const resetButton = screen.getByRole("button", { name: "Przywróć" });
    fireEvent.click(resetButton);
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("restores the saved color when Escape closes the popover", () => {
    const onDraftChange =
      vi.fn<ComponentProps<typeof NpcColorEditorPopover>["onDraftChange"]>();

    const onOpenChange =
      vi.fn<ComponentProps<typeof NpcColorEditorPopover>["onOpenChange"]>();

    render(
      <NpcColorEditorPopover
        color="#F98948"
        defaultColor="#F98948"
        npcType="HERO"
        open
        saving={false}
        onOpenChange={onOpenChange}
        onDraftChange={onDraftChange}
        onCommit={vi.fn<
          ComponentProps<typeof NpcColorEditorPopover>["onCommit"]
        >()}
        onReset={vi.fn<
          ComponentProps<typeof NpcColorEditorPopover>["onReset"]
        >()}
      >
        <button type="button">Hero</button>
      </NpcColorEditorPopover>,
    );

    fireEvent.change(screen.getByLabelText("Wybierz kolor"), {
      target: { value: "#123456" },
    });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onDraftChange).toHaveBeenLastCalledWith("#F98948");
    expect(
      onOpenChange.mock.calls.some(([nextOpen]) => nextOpen === false),
    ).toBe(true);
  });

  it("does not commit Enter while an input method is composing", () => {
    const onCommit = vi.fn();
    render(
      <NpcColorEditorPopover
        color="#F98948"
        defaultColor="#F98948"
        npcType="HERO"
        open
        saving={false}
        onOpenChange={vi.fn()}
        onDraftChange={vi.fn()}
        onCommit={onCommit}
        onReset={vi.fn()}
      >
        <button type="button">Hero</button>
      </NpcColorEditorPopover>,
    );
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "#123456" } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter", isComposing: false });
    expect(onCommit).toHaveBeenCalledWith("#123456");
  });
});
