// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeroTabs } from "./hero-tabs";

await initializeTestTranslations();

afterEach(cleanup);

const heroes = [
  { id: "hero-1", npcName: "Zorin" },
  { id: "hero-2", npcName: "Mushita" },
];

const selectTab = (name: string) => {
  const tab = screen.getByRole("tab", { name });

  fireEvent.mouseDown(tab);
  fireEvent.click(tab);
};

describe("HeroTabs", () => {
  it("reports the selected hero by id", () => {
    const onValueChange = vi.fn();

    render(
      <HeroTabs
        placement="page"
        heroes={heroes}
        value="hero-1"
        onValueChange={onValueChange}
      />,
    );

    selectTab("Mushita");

    expect(onValueChange).toHaveBeenCalledWith("hero-2");
  });

  it("reports the selected hero by name when the view keys heroes by name", () => {
    const onValueChange = vi.fn();

    render(
      <HeroTabs
        placement="section"
        heroes={heroes}
        valueKey="npcName"
        value="Zorin"
        onValueChange={onValueChange}
      />,
    );

    selectTab("Mushita");

    expect(onValueChange).toHaveBeenCalledWith("Mushita");
  });

  it("clears the hero selection through the all-heroes tab", () => {
    const onValueChange = vi.fn();

    render(
      <HeroTabs
        placement="page"
        heroes={heroes}
        includeAll
        value="hero-1"
        onValueChange={onValueChange}
      />,
    );

    selectTab("events.kills.allHeroes");

    expect(onValueChange).toHaveBeenCalledWith(undefined);
  });

  it("does not render when the event has one hero", () => {
    const { container } = render(
      <HeroTabs
        placement="page"
        heroes={[heroes[0]!]}
        includeAll
        value={undefined}
        onValueChange={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
