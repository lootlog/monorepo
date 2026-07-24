import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CHAT_APPEARANCE_COMPACT_PRESET,
  CHAT_APPEARANCE_READABLE_PRESET,
  DEFAULT_NPC_TYPE_COLORS,
} from "@lootlog/types";
import { ChatAppearancePresetMiniPreview } from "./chat-appearance-preset-mini-preview";

vi.mock("@/components/npc-tile", () => ({
  NpcTile: ({ npc }: { npc: { icon: string; nick: string } }) => (
    <div data-icon={npc.icon} data-testid="preset-npc-avatar">
      {npc.nick}
    </div>
  ),
}));

describe("ChatAppearancePresetMiniPreview", () => {
  it("renders a deterministic real player and NPC scene without interactions", async () => {
    render(
      <ChatAppearancePresetMiniPreview
        npcTypeColors={DEFAULT_NPC_TYPE_COLORS}
        settings={CHAT_APPEARANCE_READABLE_PRESET}
      />,
    );

    const preview = screen.getByTestId("chat-preset-mini-preview");
    expect(preview).toHaveAttribute("aria-hidden", "true");
    expect(preview).toHaveClass("ll:touch-pan-y");
    expect(preview).not.toHaveClass("ll:pointer-events-none");
    await waitFor(() => {
      expect(
        preview.querySelector("[data-ll-scroll-area-viewport]"),
      ).toHaveStyle({
        overflowX: "hidden",
        overflowY: "scroll",
        overscrollBehavior: "contain",
      });
    });
    expect(preview).toHaveTextContent("Lunara");
    expect(preview).not.toHaveTextContent("Strażnicy Północy");
    expect(preview).toHaveTextContent("Spotkajmy się przy wejściu.");
    expect(preview).toHaveTextContent("Mroczny Łowca");
    expect(preview).toHaveTextContent("Stare Ruiny");
    expect(screen.getByTestId("preset-npc-avatar")).toHaveAttribute(
      "data-icon",
      "tyt/maddok-tytan2.gif",
    );
    expect(
      preview.querySelector(
        "button, a, input, select, textarea, [tabindex]:not([data-ll-scroll-area-viewport])",
      ),
    ).not.toBeInTheDocument();
  });

  it("uses compact density and hides the NPC avatar for the compact preset", () => {
    render(
      <ChatAppearancePresetMiniPreview
        npcTypeColors={DEFAULT_NPC_TYPE_COLORS}
        settings={CHAT_APPEARANCE_COMPACT_PRESET}
      />,
    );

    const preview = screen.getByTestId("chat-preset-mini-preview");
    expect(preview.style.getPropertyValue("--ll-chat-font-size")).toBe(
      "10.8px",
    );
    expect(screen.queryByTestId("preset-npc-avatar")).not.toBeInTheDocument();
    expect(preview).toHaveTextContent("Mroczny Łowca");
  });
});
