import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Alert } from "./alert";
import { Badge } from "./badge";
import { Field, FieldError, FieldLabel } from "./field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./input-group";
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
});
