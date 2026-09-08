// @vitest-environment happy-dom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollArea } from "./scroll-area";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(1000);
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(1000);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
});

describe("ScrollArea", () => {
  it("renders both scrollbars by default", async () => {
    const { container } = render(<ScrollArea>Content</ScrollArea>);

    await waitFor(() =>
      expect(
        container.querySelector(
          '[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]',
        ),
      ).not.toBeNull(),
    );
    await waitFor(() =>
      expect(
        container.querySelector(
          '[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]',
        ),
      ).not.toBeNull(),
    );
  });

  it("omits the horizontal scrollbar in vertical mode", async () => {
    const { container } = render(
      <ScrollArea orientation="vertical">Content</ScrollArea>,
    );

    await waitFor(() =>
      expect(
        container.querySelector(
          '[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]',
        ),
      ).not.toBeNull(),
    );
    await waitFor(() =>
      expect(
        container.querySelector(
          '[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]',
        ),
      ).toBeNull(),
    );
  });
});
