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
    render(<EventKillsSummary eventName="Wakacje 2026" heroName="Zorin" />);

    expect(screen.getByRole("heading", { name: "Wakacje 2026" })).toBeTruthy();
    expect(screen.getByText("Zorin")).toBeTruthy();
  });

  it("shows the all-heroes context without a selected hero", () => {
    render(<EventKillsSummary eventName="Wakacje 2026" />);

    expect(screen.getByText("events.kills.allHeroes")).toBeTruthy();
  });
});
