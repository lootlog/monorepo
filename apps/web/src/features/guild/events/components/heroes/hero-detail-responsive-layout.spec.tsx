// @vitest-environment happy-dom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HeroDetailResponsiveLayout } from "./hero-detail-responsive-layout";

afterEach(cleanup);

describe("HeroDetailResponsiveLayout", () => {
  it("keeps participants before maps on narrow screens and in the desktop sidebar", () => {
    const { container } = render(
      <HeroDetailResponsiveLayout
        maps={<div>Maps</div>}
        participants={<div>Participants</div>}
        sidebar={<div>Ranking</div>}
      />,
    );

    const layout = container.querySelector("[data-hero-detail-layout]");
    const maps = container.querySelector('[data-hero-detail-slot="maps"]');
    const secondary = container.querySelector(
      '[data-hero-detail-slot="secondary"]',
    );
    const participants = container.querySelector(
      '[data-hero-detail-slot="participants"]',
    );
    const sidebar = container.querySelector(
      '[data-hero-detail-slot="sidebar"]',
    );

    expect(layout?.className).toContain("lg:grid-cols-3");
    expect(maps?.className).toContain("order-2");
    expect(maps?.className).toContain("lg:col-span-2");
    expect(secondary?.className).toContain("contents");
    expect(secondary?.className).toContain("lg:block");
    expect(participants?.className).toContain("order-1");
    expect(sidebar?.className).toContain("order-3");
    expect(participants?.parentElement).toBe(secondary);
    expect(sidebar?.parentElement).toBe(secondary);
  });

  it("does not reserve a participant slot when the list is empty", () => {
    const { container } = render(
      <HeroDetailResponsiveLayout
        maps={<div>Maps</div>}
        sidebar={<div>Ranking</div>}
      />,
    );

    expect(
      container.querySelector('[data-hero-detail-slot="participants"]'),
    ).toBeNull();
  });
});
