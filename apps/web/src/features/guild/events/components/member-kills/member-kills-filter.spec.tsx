// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemberKillsFilter } from "./member-kills-filter";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

afterEach(cleanup);

describe("MemberKillsFilter", () => {
  it("lets the user filter the kill history by hero", () => {
    const onSelectedHeroChange = vi.fn();

    render(
      <MemberKillsFilter
        heroes={[
          {
            id: "hero-1",
            npcId: 123,
            npcIcon: null,
            npcName: "Zorin",
          },
          {
            id: "hero-2",
            npcId: 456,
            npcIcon: null,
            npcName: "Mushita",
          },
        ]}
        onSelectedHeroChange={onSelectedHeroChange}
      />,
    );

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Zorin" }));
    fireEvent.click(screen.getByRole("tab", { name: "Zorin" }));

    expect(onSelectedHeroChange).toHaveBeenCalledWith("hero-1");
  });

  it("does not render when there is only one hero", () => {
    const { container } = render(
      <MemberKillsFilter
        heroes={[
          {
            id: "hero-1",
            npcId: 123,
            npcIcon: null,
            npcName: "Zorin",
          },
        ]}
        onSelectedHeroChange={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
