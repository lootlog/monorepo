import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatNpcCountBadge } from "./chat-npc-count-badge";

describe("ChatNpcCountBadge", () => {
  it("renders grouped history without playing the increment animation", () => {
    render(<ChatNpcCountBadge count={3} />);

    expect(screen.getByText("x3")).not.toHaveClass("ll-chat-npc-count-bump");
  });

  it("plays the bump when a second grouped message arrives", () => {
    const { rerender } = render(<ChatNpcCountBadge count={1} />);

    expect(screen.queryByText("x1")).not.toBeInTheDocument();

    rerender(<ChatNpcCountBadge count={2} />);

    expect(screen.getByText("x2")).toHaveClass("ll-chat-npc-count-bump");
  });

  it("restarts the bump for each consecutive count increase", () => {
    const { rerender } = render(<ChatNpcCountBadge count={1} />);

    rerender(<ChatNpcCountBadge count={2} />);
    const secondMessageBadge = screen.getByText("x2");

    rerender(<ChatNpcCountBadge count={3} />);
    const thirdMessageBadge = screen.getByText("x3");

    expect(thirdMessageBadge).toHaveClass("ll-chat-npc-count-bump");
    expect(thirdMessageBadge).not.toBe(secondMessageBadge);
  });
});
