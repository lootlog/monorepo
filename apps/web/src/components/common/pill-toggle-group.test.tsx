// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PillToggleGroup } from "./pill-toggle-group";

afterEach(cleanup);

const OPTIONS = [
  { value: "all", label: "All" },
  { value: "online", label: "Online" },
  { value: "hidden", label: "Hidden" },
] as const;

describe("PillToggleGroup", () => {
  it("keeps the pressed pill of a single choice instead of clearing it", () => {
    const onValueChange = vi.fn();
    render(
      <PillToggleGroup
        label="Status"
        options={OPTIONS}
        value="online"
        onValueChange={onValueChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Online" }));
    expect(onValueChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(onValueChange).toHaveBeenCalledWith("all");
  });
});
