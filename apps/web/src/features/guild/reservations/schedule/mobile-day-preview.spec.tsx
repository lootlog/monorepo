// @vitest-environment happy-dom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileDayPreview } from "./mobile-day-preview";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const getHourBackground = (container: HTMLElement, hourIndex: number) => {
  const hourRows = container.querySelectorAll(".absolute.inset-x-0.flex");
  const background = hourRows[hourIndex]?.lastElementChild;
  expect(background).toBeInstanceOf(HTMLDivElement);
  return background;
};

describe("MobileDayPreview", () => {
  it("uses the same unavailable-hour background as the active day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 8, 12, 30));

    const { container, rerender } = render(
      <MobileDayPreview
        date={new Date(2026, 0, 7)}
        dayIndex={2}
        segments={[]}
      />,
    );

    expect(getHourBackground(container, 8)?.className).toContain("bg-muted/20");

    rerender(
      <MobileDayPreview
        date={new Date(2026, 0, 8)}
        dayIndex={3}
        segments={[]}
      />,
    );
    expect(getHourBackground(container, 11)?.className).toContain(
      "bg-muted/20",
    );
    expect(getHourBackground(container, 13)?.className).toContain(
      "bg-background",
    );
  });
});
