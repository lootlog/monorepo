import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion";

describe("AccordionContent", () => {
  it("uses the Radix state without installing a MutationObserver", () => {
    const OriginalMutationObserver = window.MutationObserver;
    const mutationObserver = vi.fn(
      class {
        disconnect = vi.fn();
        observe = vi.fn();
        takeRecords = vi.fn(() => []);
      },
    );
    window.MutationObserver =
      mutationObserver as unknown as typeof MutationObserver;

    try {
      render(
        <Accordion type="single" defaultValue="item">
          <AccordionItem value="item">
            <AccordionTrigger>Trigger</AccordionTrigger>
            <AccordionContent>Content</AccordionContent>
          </AccordionItem>
        </Accordion>,
      );

      expect(mutationObserver).not.toHaveBeenCalled();
    } finally {
      window.MutationObserver = OriginalMutationObserver;
    }
  });
});
