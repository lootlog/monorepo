// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ActorNameSelector } from "./actor-name-selector";

await initializeTestTranslations();

afterEach(cleanup);

it("preserves server suggestions and selects a trimmed custom actor through the keyboard", async () => {
  const props = {
    value: "",
    suggestions: ["Inny gracz"],
    searchValue: "",
    onSearchChange: vi.fn(),
    onValueChange: vi.fn(),
    placeholder: "Gracz",
  };

  const { rerender } = render(<ActorNameSelector {...props} />);
  expect(screen.queryByRole("button", { name: "common.clear" })).toBeNull();
  fireEvent.click(screen.getByRole("combobox", { name: "Gracz" }));

  const input = await screen.findByPlaceholderText(
    "activityLogs.filters.suggestions.inputPlaceholder",
  );

  fireEvent.change(input, { target: { value: "  Nowy gracz  " } });
  expect(props.onSearchChange).toHaveBeenCalledWith("  Nowy gracz  ");
  rerender(<ActorNameSelector {...props} searchValue="  Nowy gracz  " />);
  await screen.findByRole("option", { name: "Inny gracz" });
  await screen.findByRole("option", {
    name: "activityLogs.filters.suggestions.useCustom",
  });
  fireEvent.keyDown(input, { key: "End" });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() =>
    expect(props.onValueChange).toHaveBeenCalledWith("Nowy gracz"),
  );
  expect(props.onSearchChange).toHaveBeenLastCalledWith("Nowy gracz");
});

it("clears both the actor filter and its search without opening the popup", () => {
  const onSearchChange = vi.fn();
  const onValueChange = vi.fn();
  render(
    <ActorNameSelector
      value="Gracz"
      suggestions={[]}
      searchValue="Gracz"
      onSearchChange={onSearchChange}
      onValueChange={onValueChange}
      placeholder="Gracz"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "common.clear" }));
  expect(onSearchChange).toHaveBeenCalledWith("");
  expect(onValueChange).toHaveBeenCalledWith("");
  expect(screen.getByRole("combobox").getAttribute("aria-expanded")).toBe(
    "false",
  );
});
