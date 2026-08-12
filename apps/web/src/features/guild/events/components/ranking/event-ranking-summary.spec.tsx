// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventRankingSummary } from "./event-ranking-summary";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

afterEach(cleanup);

describe("EventRankingSummary", () => {
  it("presents the selected monster without aggregate ranking metrics", () => {
    render(
      <EventRankingSummary
        eventName="Wakacje 2026"
        selectedHeroName="Mushita"
      />,
    );

    expect(screen.getByRole("heading", { name: "Mushita" })).toBeTruthy();
    expect(screen.getByText("Wakacje 2026")).toBeTruthy();
    expect(screen.getByText("events.ranking.title")).toBeTruthy();
    expect(screen.queryByText("events.ranking.participants")).not.toBeTruthy();
  });
});
