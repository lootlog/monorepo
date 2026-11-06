import { useLayoutEffect, useRef } from "react";
import { getPrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { EASE_EMPHASIZED_CSS, MOTION_DURATION } from "@/lib/motion";

/** What changes with the Organization: its sidebar column and its page. */
const ORGANIZATION_SURFACES_SELECTOR =
  "#main-content, [data-slot=sidebar-navigation]";

/**
 * Fades the sidebar column and page in together when another Organization
 * opens, so the switch reads as one step instead of a hard cut. Opacity
 * alone, on the compositor: nothing moves and the layout never shifts.
 */
export const useOrganizationSwitchFade = () => {
  const guildId = useGuildId();
  const previousGuildId = useRef(guildId);

  useLayoutEffect(() => {
    const previous = previousGuildId.current;

    previousGuildId.current = guildId;

    if (!previous || !guildId || previous === guildId) return;

    if (getPrefersReducedMotion()) return;

    for (const surface of document.querySelectorAll(
      ORGANIZATION_SURFACES_SELECTOR,
    )) {
      surface.animate([{ offset: 0, opacity: 0 }], {
        duration: MOTION_DURATION.medium * 1000,
        easing: EASE_EMPHASIZED_CSS,
        fill: "backwards",
      });
    }
  }, [guildId]);
};
