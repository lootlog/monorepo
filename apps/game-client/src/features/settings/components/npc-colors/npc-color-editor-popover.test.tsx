import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NpcColorEditorPopover } from "./npc-color-editor-popover";

describe("NpcColorEditorPopover", () => {
  it("shows faithful samples and a spaced restore action", () => {
    const onReset = vi.fn();

    render(
      <NpcColorEditorPopover
        color="#AA5500"
        defaultColor="#F98948"
        npcType="HERO"
        open
        saving={false}
        onOpenChange={vi.fn()}
        onDraftChange={vi.fn()}
        onCommit={vi.fn()}
        onReset={onReset}
      >
        <button type="button">Hero</button>
      </NpcColorEditorPopover>,
    );

    expect(screen.getByText("Powiadomienie o wykryciu potwora")).toHaveClass(
      "ll:text-white",
    );
    expect(screen.getByText("Potwór widoczny w wykrywaczu")).toHaveClass(
      "ll:text-white",
    );

    const resetButton = screen.getByRole("button", { name: "Przywróć" });
    expect(resetButton).toHaveClass("ll:gap-2");
    fireEvent.click(resetButton);
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("restores the saved color when Escape closes the popover", () => {
    const onDraftChange = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <NpcColorEditorPopover
        color="#F98948"
        defaultColor="#F98948"
        npcType="HERO"
        open
        saving={false}
        onOpenChange={onOpenChange}
        onDraftChange={onDraftChange}
        onCommit={vi.fn()}
        onReset={vi.fn()}
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
});
