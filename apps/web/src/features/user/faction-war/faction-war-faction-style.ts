import type { FactionWarFaction } from "@lootlog/domain/faction-war";
import "./faction-war.css";

/** The colour classes of each faction (`faction-war.css`). */
export const FACTION_WAR_STYLE: Record<
  FactionWarFaction,
  {
    /** A bar, swatch or other fill. */
    fill: string;
    /** Text on the page's own surfaces. */
    text: string;
    /** Text over the war art. */
    textOnArt: string;
    /** The fill as a CSS colour, for charts. */
    color: string;
  }
> = {
  BARBATOS: {
    fill: "bg-(--faction-barbatos)",
    text: "text-(--faction-barbatos-text)",
    textOnArt: "text-(--faction-barbatos-on-art)",
    color: "var(--faction-barbatos)",
  },
  TANROTH: {
    fill: "bg-(--faction-tanroth)",
    text: "text-(--faction-tanroth-text)",
    textOnArt: "text-(--faction-tanroth-on-art)",
    color: "var(--faction-tanroth)",
  },
};
