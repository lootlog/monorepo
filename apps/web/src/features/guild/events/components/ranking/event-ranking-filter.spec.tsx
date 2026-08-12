// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventRankingFilter } from "./event-ranking-filter";

afterEach(cleanup);

describe("EventRankingFilter", () => {
  it("does not render when only one hero is available", () => {
    const { container } = render(
      <EventRankingFilter
        heroes={[
          {
            id: "hero-1",
            npcId: 123,
            npcIcon: null,
            npcLvl: 100,
            npcName: "Zorin",
          },
        ]}
        selectedHeroName="Zorin"
        onSelectedHeroChange={vi.fn()}
      />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("changes the selected hero through the tab control", () => {
    const onSelectedHeroChange = vi.fn();

    render(
      <EventRankingFilter
        heroes={[
          {
            id: "hero-1",
            npcId: 123,
            npcIcon: null,
            npcLvl: 100,
            npcName: "Zorin",
          },
          {
            id: "hero-2",
            npcId: 456,
            npcIcon: null,
            npcLvl: 110,
            npcName: "Mushita",
          },
        ]}
        selectedHeroName="Zorin"
        onSelectedHeroChange={onSelectedHeroChange}
      />,
    );

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Mushita" }));
    fireEvent.click(screen.getByRole("tab", { name: "Mushita" }));

    expect(onSelectedHeroChange).toHaveBeenCalledWith("Mushita");
  });
});
