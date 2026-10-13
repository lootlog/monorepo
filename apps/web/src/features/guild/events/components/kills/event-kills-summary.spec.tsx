// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EventKillsSummary } from "./event-kills-summary";

await initializeTestTranslations();

afterEach(cleanup);

describe("EventKillsSummary", () => {
  it("distinguishes loading, zero, and unavailable kill counts", () => {
    const { container, rerender } = render(
      <EventKillsSummary isKillCountLoading />,
    );

    expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy();

    rerender(<EventKillsSummary killCount={0} />);
    expect(screen.getByText("0")).toBeTruthy();

    rerender(<EventKillsSummary />);
    expect(screen.getByLabelText("events.kills.statsUnavailable")).toBeTruthy();
  });
});
