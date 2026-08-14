import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { ScrollArea } from "./scroll-area";

describe("Base UI disclosure components", () => {
  it("opens an accordion item with array-based values", () => {
    render(
      <Accordion defaultValue={[]}>
        <AccordionItem value="details">
          <AccordionTrigger>Details</AccordionTrigger>
          <AccordionContent>Accordion content</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Details" }));

    expect(screen.getByText("Accordion content")).toBeVisible();
  });

  it("reports controlled accordion values", () => {
    const handleValueChange = vi.fn();
    render(
      <Accordion value={[]} onValueChange={handleValueChange}>
        <AccordionItem value="details">
          <AccordionTrigger>Controlled details</AccordionTrigger>
          <AccordionContent>Controlled content</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Controlled details" }));
    expect(handleValueChange).toHaveBeenCalledWith(
      ["details"],
      expect.any(Object),
    );
  });

  it("opens collapsible content", () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>More</CollapsibleTrigger>
        <CollapsibleContent>Collapsible content</CollapsibleContent>
      </Collapsible>,
    );

    fireEvent.click(screen.getByRole("button", { name: "More" }));

    expect(screen.getByText("Collapsible content")).toBeVisible();
  });

  it("switches tabs", () => {
    render(
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        <TabsContent value="general">General panel</TabsContent>
        <TabsContent value="advanced">Advanced panel</TabsContent>
      </Tabs>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));

    expect(screen.getByText("Advanced panel")).toBeVisible();
  });

  it("forwards viewport scroll events", () => {
    const handleScroll = vi.fn();
    const { container } = render(
      <ScrollArea aria-label="Scrollable content" onScroll={handleScroll}>
        <div>Long content</div>
      </ScrollArea>,
    );

    const viewport = container.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!viewport) throw new Error("Scroll area viewport was not rendered.");
    fireEvent.scroll(viewport);
    expect(handleScroll).toHaveBeenCalledOnce();
  });
});
