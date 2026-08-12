// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventKillsFilter } from "./event-kills-filter";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

afterEach(cleanup);

describe("EventKillsFilter", () => {
  const heroes = [
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
  ];

  it("changes the selected hero", () => {
    const onSelectedHeroChange = vi.fn();

    render(
      <EventKillsFilter
        heroes={heroes}
        selectedHeroId="hero-1"
        onSelectedHeroChange={onSelectedHeroChange}
      />,
    );

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Mushita" }));
    fireEvent.click(screen.getByRole("tab", { name: "Mushita" }));

    expect(onSelectedHeroChange).toHaveBeenCalledWith("hero-2");
  });

  it("clears the hero filter through the all-heroes tab", () => {
    const onSelectedHeroChange = vi.fn();

    render(
      <EventKillsFilter
        heroes={heroes}
        selectedHeroId="hero-1"
        onSelectedHeroChange={onSelectedHeroChange}
      />,
    );

    const allHeroesTab = screen.getByRole("tab", {
      name: "events.kills.allHeroes",
    });
    fireEvent.mouseDown(allHeroesTab);
    fireEvent.click(allHeroesTab);

    expect(onSelectedHeroChange).toHaveBeenCalledWith(undefined);
  });

  it("does not render when there is only one hero", () => {
    const { container } = render(
      <EventKillsFilter heroes={[heroes[0]!]} onSelectedHeroChange={vi.fn()} />,
    );

    expect(container.firstChild).toBeNull();
  });
});
