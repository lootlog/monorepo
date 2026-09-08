import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Separator } from "./separator";
import { Switch } from "./switch";
import { FilterPopover } from "./filter-popover";

describe("Base UI controls", () => {
  it("renders a custom button element through the render prop", () => {
    render(
      <Button render={<a href="/settings" />} nativeButton={false}>
        Settings
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("reports checkbox state changes", () => {
    const handleCheckedChange = vi.fn();
    render(
      <Checkbox
        aria-label="Notifications"
        onCheckedChange={handleCheckedChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Notifications" }));

    expect(handleCheckedChange).toHaveBeenCalledWith(true, expect.any(Object));
  });

  it("does not change a disabled checkbox", () => {
    const handleCheckedChange = vi.fn();
    render(
      <Checkbox
        aria-label="Disabled notifications"
        disabled
        onCheckedChange={handleCheckedChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Disabled notifications" }),
    );
    expect(handleCheckedChange).not.toHaveBeenCalled();
  });

  it("reports switch state changes", () => {
    const handleCheckedChange = vi.fn();
    render(
      <Switch aria-label="Dark mode" onCheckedChange={handleCheckedChange} />,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Dark mode" }));

    expect(handleCheckedChange).toHaveBeenCalledWith(true, expect.any(Object));
  });

  it("changes the selected radio item", () => {
    const handleValueChange = vi.fn();
    render(
      <RadioGroup aria-label="Theme" onValueChange={handleValueChange}>
        <RadioGroupItem value="light" aria-label="Light" />
        <RadioGroupItem value="dark" aria-label="Dark" />
      </RadioGroup>,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));

    expect(handleValueChange).toHaveBeenCalledWith("dark", expect.any(Object));
  });

  it.each([
    ["horizontal", "data-[orientation=horizontal]:h-px"],
    ["vertical", "data-[orientation=vertical]:w-px"],
  ] as const)(
    "styles a %s separator using Base UI's orientation attribute",
    (orientation, orientationClassName) => {
      const { container } = render(<Separator orientation={orientation} />);
      const separator = container.firstElementChild;

      expect(separator).toHaveAttribute("role", "separator");
      expect(separator).toHaveAttribute("data-orientation", orientation);
      expect(separator).toHaveClass(orientationClassName);
    },
  );
});

it("names filter search by its context and allows selecting a filtered option", async () => {
  const onValueChange = vi.fn<(value: string) => void>();
  render(
    <FilterPopover
      placeholder="Świat"
      searchPlaceholder="Szukaj…"
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
