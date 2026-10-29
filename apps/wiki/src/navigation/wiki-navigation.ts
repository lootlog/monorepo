import { linkOptions } from "@tanstack/react-router";
import { House, Package, Skull } from "lucide-react";
import type { ItemsSearch } from "@/lib/items-search";

/** The item search with no filters, which links extend with their own. */
export const EMPTY_ITEMS_SEARCH: ItemsSearch = {
  query: "",
  slot: "",
  types: "",
  professions: "",
  rarities: "",
  minLevel: "",
  maxLevel: "",
  stats: "",
  bosses: "",
  recent: "",
  sort: "relevance",
};

/** Every wiki section, in sidebar order; links open a section's empty search. */
export const WIKI_NAVIGATION = [
  {
    link: linkOptions({ to: "/" }),
    labelKey: "navigation.home",
    icon: House,
  },
  {
    link: linkOptions({
      to: "/items",
      search: EMPTY_ITEMS_SEARCH,
    }),
    labelKey: "navigation.items",
    descriptionKey: "home.itemsDescription",
    icon: Package,
  },
  {
    link: linkOptions({ to: "/npcs", search: { query: "" } }),
    labelKey: "navigation.npcs",
    descriptionKey: "home.npcsDescription",
    icon: Skull,
  },
];

/** The section a path belongs to. */
export const findWikiSection = (pathname: string) =>
  WIKI_NAVIGATION.find(({ link }) =>
    link.to === "/" ? pathname === "/" : pathname.startsWith(link.to),
  );
