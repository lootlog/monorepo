import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { getLootlogHostPortalThemeClassName } from "@/components/ui/theme-boundary";
import {
  getWhoIsHereAirTagHost,
  refreshWhoIsHereScroll,
} from "@/lib/margonem-runtime/adapters/who-is-here-runtime-adapter";
import { useWhoIsHereAirTagEnemies } from "./use-who-is-here-air-tag-enemies";
import { WhoIsHereAirTagRow } from "./who-is-here-air-tag-row";

/** Enemies other members see on this map, listed under the game's "Gracze na mapie". */
export function WhoIsHereAirTags() {
  const { t } = useTranslation("settings");
  const { enemies, now } = useWhoIsHereAirTagEnemies();
  const host = enemies.length > 0 ? getWhoIsHereAirTagHost() : null;

  useEffect(() => {
    refreshWhoIsHereScroll();
  }, [enemies.length]);

  if (!host) return null;
  const title = t("airTags.whoIsHereTitle");

  return createPortal(
    <section
      aria-label={title}
      className={cn(getLootlogHostPortalThemeClassName(), "ll:mt-1")}
    >
      <div className="c-line" />
      <h3 className="ll:mb-1 ll:text-center ll:text-xs ll:font-bold ll:text-[#f5f5dc]">
        {title} ({enemies.length})
      </h3>
      {enemies.map((enemy) => (
        <WhoIsHereAirTagRow key={enemy.targetId} enemy={enemy} now={now} />
      ))}
    </section>,
    host,
  );
}
