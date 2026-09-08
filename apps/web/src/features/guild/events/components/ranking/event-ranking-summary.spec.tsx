// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EventRankingSummary } from "./event-ranking-summary";

await initializeTestTranslations();

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
