import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { FilterPopover } from "./filter-popover";

it("names filter search by its context and allows selecting a filtered option", async () => {
  const onValueChange = vi.fn<(value: string) => void>();
  render(
    <FilterPopover
      placeholder="Świat"
      searchPlaceholder="Szukaj…"
      emptyMessage="Brak wyników"
      options={[{ value: "luvia", label: "Luvia" }]}
      onValueChange={onValueChange}
    />,
  );
  fireEvent.click(screen.getByRole("combobox", { name: "Świat" }));
  const dialog = await screen.findByRole("dialog");
  const search = within(dialog).getByRole("combobox", { name: "Świat" });
  fireEvent.change(search, { target: { value: "Luv" } });
  fireEvent.click(await within(dialog).findByRole("option", { name: "Luvia" }));
  expect(onValueChange).toHaveBeenCalledWith("luvia");
});
