import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageCircle } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders accessible centered content and an optional action", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <EmptyState
        action={
          <button onClick={onAction} type="button">
            Reset
          </button>
        }
        icon={MessageCircle}
        title="No messages"
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveClass(
      "ll:h-full",
      "ll:box-border",
      "ll:flex-col",
      "ll:items-center",
      "ll:justify-center",
    );
    expect(screen.getByText("No messages")).toBeVisible();
    expect(status.querySelector("svg")).toHaveAttribute("aria-hidden", "true");

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(onAction).toHaveBeenCalledOnce();
  });
});
