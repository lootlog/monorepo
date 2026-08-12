// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventKillsSummary } from "./event-kills-summary";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

afterEach(cleanup);

describe("EventKillsSummary", () => {
  it("shows the event and selected hero context", () => {
    render(
      <EventKillsSummary
        eventName="Wakacje 2026"
        heroName="Zorin"
        killCount={88}
      />,
    );

    expect(screen.getByRole("heading", { name: "Wakacje 2026" })).toBeTruthy();
    expect(screen.getByText("Zorin")).toBeTruthy();
    expect(screen.getByText("events.kills.killCount")).toBeTruthy();
    expect(screen.getByText("88")).toBeTruthy();
  });

  it("shows the all-heroes context without a selected hero", () => {
    render(<EventKillsSummary eventName="Wakacje 2026" />);

    expect(screen.getByText("events.kills.allHeroes")).toBeTruthy();
  });

  it("distinguishes loading, zero, and unavailable kill counts", () => {
    const { container, rerender } = render(
      <EventKillsSummary eventName="Wakacje 2026" isKillCountLoading />,
    );

    expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy();

    rerender(<EventKillsSummary eventName="Wakacje 2026" killCount={0} />);
    expect(screen.getByText("0")).toBeTruthy();

    rerender(<EventKillsSummary eventName="Wakacje 2026" />);
    expect(screen.getByLabelText("events.kills.statsUnavailable")).toBeTruthy();
  });
});
