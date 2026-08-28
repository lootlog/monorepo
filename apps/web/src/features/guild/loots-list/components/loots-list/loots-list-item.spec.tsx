// @vitest-environment happy-dom

import type { ComponentProps, ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Loot } from "@/lib/loots/loot-types";
import { LootsListItem } from "./loots-list-item";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      transition: _transition,
      ...props
    }: ComponentProps<"div"> & {
      children?: ReactNode;
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
    }) => <div {...props}>{children}</div>,
  },
  useReducedMotion: () => true,
}));

vi.mock("@/components/tiles", () => ({
  PlayerTile: ({ player }: { player: Loot["players"][number] }) => (
    <div>{player.name}</div>
  ),
  WatchableItemTile: ({ item }: { item: Loot["items"][number] }) => (
    <div>{item.name}</div>
  ),
}));

vi.mock("./loot-npcs", () => ({
  LootNpcs: ({ npcs }: { npcs: Loot["npcs"] }) => <div>{npcs[0]?.name}</div>,
}));

vi.mock("./item-stack", () => ({
  ItemStack: () => <div>item-stack</div>,
}));

vi.mock("@/hooks/use-selected-loot", () => ({
  useSelectedLoot: () => ({ openLootDetails: vi.fn() }),
}));

vi.mock("@/hooks/use-loots-filters", () => ({
  useLootsFilters: () => ({
    filters: { players: [], itemNames: [] },
    setFilters: vi.fn(),
  }),
}));

vi.mock("@/themes/use-theme-meta", () => ({
  useThemeMeta: () => ({ isRukiaTheme: false }),
}));

vi.mock("@/utils/date/parse-timestamp-to-date", () => ({
  timestampToDate: () => "12.08.2026",
}));

afterEach(cleanup);

describe("LootsListItem presentation", () => {
  it("uses the standalone card presentation by default", () => {
    const { container } = render(<LootsListItem loot={createLoot()} />);

    expect(container.querySelector("[data-slot='card']")).toBeTruthy();
    expect(screen.getByTestId("loot-list-item").dataset.presentation).toBe(
      "card",
    );
  });

  it("renders the same loot content without a nested card when embedded", () => {
    const { container } = render(
      <LootsListItem loot={createLoot()} variant="embedded" />,
    );

    expect(container.querySelector("[data-slot='card']")).toBeNull();
    expect(screen.getByTestId("loot-list-item").dataset.presentation).toBe(
      "embedded",
    );
    expect(screen.getByText("Potulny Berserker")).toBeTruthy();
    expect(screen.getByText("Tester")).toBeTruthy();
    expect(screen.getByText("item-stack")).toBeTruthy();
  });
});

function createLoot(): Loot {
  return {
    id: 1,
    uniqueId: "loot-1",
    world: "tempest",
    source: "FIGHT",
    location: "Starorzecze Narumi",
    items: [
      {
        id: 1,
        hid: "item-1",
        name: "Legendarny przedmiot",
        icon: "item.png",
        stat: "",
        type: null,
        rarity: "LEGENDARY",
        lvl: 284,
        prof: [],
      },
    ],
    players: [
      {
        id: "player-1",
        name: "Tester",
        lvl: 284,
        prof: null,
        icon: null,
        characterId: null,
        accountId: null,
        hpp: null,
      },
    ],
    npcs: [
      {
        id: 1,
        name: "Potulny Berserker",
        wt: 284,
        lvl: 284,
        prof: null,
        icon: null,
        type: null,
        margonemType: null,
      },
    ],
    lootShare: { "player-1": ["item-1"] },
    createdAt: "2026-08-12T10:54:00.000Z",
    updatedAt: "2026-08-12T10:54:00.000Z",
    commentsCount: 0,
  };
}
