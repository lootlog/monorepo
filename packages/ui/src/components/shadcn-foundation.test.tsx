import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Breadcrumb, BreadcrumbEllipsis } from "./breadcrumb";
import { InputGroup, InputGroupAddon, InputGroupTextarea } from "./input-group";

afterEach(cleanup);

describe("shadcn foundation", () => {
  it("keeps the breadcrumb label and collapsed-state description accessible", () => {
    const { container } = render(
      <Breadcrumb aria-label="Ścieżka nawigacji">
        <BreadcrumbEllipsis label="Więcej stron" />
      </Breadcrumb>,
    );

    expect(
      screen.getByRole("navigation", { name: "Ścieżka nawigacji" }),
    ).toBeTruthy();
    const ellipsisLabel = screen.getByText("Więcej stron");
    expect(ellipsisLabel).not.toHaveAttribute("aria-hidden");
    expect(
      ellipsisLabel.closest('[data-slot="breadcrumb-ellipsis"]'),
    ).not.toHaveAttribute("aria-hidden");
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("focuses a textarea when its addon is clicked", () => {
    render(
      <InputGroup>
        <InputGroupAddon>Message</InputGroupAddon>
        <InputGroupTextarea aria-label="Message" />
      </InputGroup>,
    );

    fireEvent.click(screen.getByText("Message"));

    expect(screen.getByRole("textbox", { name: "Message" })).toHaveFocus();
  });
});
