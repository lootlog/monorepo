import { render, screen } from "@testing-library/react";
import { it, expect } from "vitest";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import { DEFAULT_NPC_TYPE_COLORS } from "@lootlog/schema/npc-appearance";
import { ChatAppearancePresetMiniPreview } from "./chat-appearance-preset-mini-preview";

it("keeps the decorative preview out of accessibility navigation", () => {
  render(
    <ChatAppearancePresetMiniPreview
      npcTypeColors={DEFAULT_NPC_TYPE_COLORS}
      settings={CHAT_APPEARANCE_READABLE_PRESET}
    />,
  );
  const preview = screen.getByTestId("chat-preset-mini-preview");
  expect(preview).toHaveAttribute("aria-hidden", "true");
  expect(
    preview.querySelector(
      "button, a, input, select, textarea, [tabindex]:not([data-ll-scroll-area-viewport])",
    ),
  ).not.toBeInTheDocument();
});
