import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion";

describe("Accordion", () => {
  it("opens and collapses a single panel", async () => {
    const user = userEvent.setup();

    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item">
          <AccordionTrigger>Trigger</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger = screen.getByRole("button", { name: "Trigger" });
    expect(screen.queryByText("Content")).not.toBeInTheDocument();

    await user.click(trigger);
    expect(screen.getByText("Content")).toBeVisible();
    expect(trigger).toHaveAttribute("data-panel-open");

    await user.click(trigger);
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("does not open a disabled item", async () => {
    const user = userEvent.setup();

    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item" disabled>
          <AccordionTrigger disabled>Trigger</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    await user.click(screen.getByRole("button", { name: "Trigger" }));

    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });
});
