import { render, screen } from "@testing-library/react";
import {
  CHAT_APPEARANCE_READABLE_PRESET,
  DEFAULT_NPC_TYPE_COLORS,
} from "@lootlog/types";
import { describe, expect, it, vi } from "vitest";
import { ChatAppearancePresetCard } from "./chat-appearance-preset-card";

vi.mock("@/components/npc-tile", () => ({
  NpcTile: ({ npc }: { npc: { nick: string } }) => <div>{npc.nick}</div>,
}));

describe("ChatAppearancePresetCard", () => {
  it("uses the compact card shell around a real preset preview", () => {
    render(
      <ChatAppearancePresetCard
        description="Readable preset description"
        name="Readable"
        npcTypeColors={DEFAULT_NPC_TYPE_COLORS}
        onSelect={vi.fn()}
        selected
        settings={CHAT_APPEARANCE_READABLE_PRESET}
      />,
    );

    const card = screen.getByRole("button", { name: /Readable/ });
    expect(card).toHaveClass("ll:p-2", "ll:gap-1.5", "ll:min-w-0");
    expect(card).not.toHaveClass("ll:min-h-24");
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("chat-preset-mini-preview")).toBeInTheDocument();
    expect(card).toHaveTextContent("Lunara");
    expect(card).not.toHaveTextContent("Strażnicy Północy");
    expect(card).toHaveTextContent("Mroczny Łowca");
  });
});
