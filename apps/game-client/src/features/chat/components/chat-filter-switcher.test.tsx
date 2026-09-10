import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ChatFilterSwitcher } from "./chat-filter-switcher";

it("orders the filters, preserves selection on a repeated click, and supports keyboard selection", async () => {
  const user = userEvent.setup();
  const onValueChange = vi.fn();
  render(
    <ChatFilterSwitcher
      value="all"
      onValueChange={onValueChange}
      unread={{
        ids: new Set(["one"]),
        attention: 1,
        conversations: true,
        reports: false,
      }}
    />,
  );
  const buttons = screen.getAllByRole("button");
  expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
    "Wszystko",
    "Rozmowy",
    "Zdarzenia",
  ]);
  await user.click(buttons[0]);
  expect(onValueChange).not.toHaveBeenCalled();
  await user.keyboard("{ArrowRight}{Enter}");
  expect(onValueChange).toHaveBeenLastCalledWith("normal");
  await user.keyboard("{ArrowRight} ");
  expect(onValueChange).toHaveBeenLastCalledWith("reports");
});
