import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Alert } from "./alert";
import { Badge } from "./badge";
import { Breadcrumb, BreadcrumbEllipsis } from "./breadcrumb";
import { Field, FieldError, FieldLabel } from "./field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupTextarea,
} from "./input-group";
import { Item, ItemGroup } from "./item";
import { Progress } from "./progress";

afterEach(cleanup);

describe("shadcn foundation", () => {
  it.each([
    ["live", "border-signal-live/30"],
    ["ready", "border-signal-ready/30"],
    ["timer", "border-signal-timer/30"],
    ["alert", "border-signal-alert/30"],
  ] as const)("applies the %s signal variant", (variant, className) => {
    render(<Alert variant={variant}>Status</Alert>);
    expect(screen.getByRole("alert")).toHaveClass(className);
  });

  it("uses the same signal vocabulary for badges", () => {
    render(<Badge variant="ready">Ready</Badge>);
    expect(screen.getByText("Ready")).toHaveClass("bg-signal-ready/10");
  });

  it("connects invalid field structure to an invalid control", () => {
    render(
      <Field data-invalid="true">
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <InputGroup>
          <InputGroupAddon>@</InputGroupAddon>
          <InputGroupInput id="name" aria-invalid="true" />
        </InputGroup>
        <FieldError>Name is required</FieldError>
      </Field>,
    );

    expect(screen.getByRole("textbox", { name: "Name" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Name is required");
  });

  it("exposes Base UI progress semantics and signal styling", () => {
    const { container } = render(
      <Progress value={40} variant="timer" aria-label="Coverage" />,
    );

    expect(
      screen.getByRole("progressbar", { name: "Coverage" }),
    ).toHaveAttribute("aria-valuenow", "40");
    expect(
      container.querySelector('[data-slot="progress-indicator"]'),
    ).toHaveClass("bg-signal-timer");
  });

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

  it("does not claim incomplete list semantics for generic items", () => {
    render(
      <ItemGroup data-testid="items">
        <Item>Entry</Item>
      </ItemGroup>,
    );

    expect(screen.getByTestId("items")).not.toHaveAttribute("role", "list");
  });
});
