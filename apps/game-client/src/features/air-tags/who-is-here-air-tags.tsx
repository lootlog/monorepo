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
      className={cn(
        getLootlogHostPortalThemeClassName(),
        "ll:mt-1 ll:border-0 ll:border-t ll:border-solid ll:border-white/15 ll:pt-1",
      )}
    >
      <h3 className="ll:m-0 ll:px-1 ll:text-[11px] ll:font-semibold ll:text-muted-foreground">
        {title} ({enemies.length})
      </h3>
      {enemies.map((enemy) => (
        <WhoIsHereAirTagRow key={enemy.targetId} enemy={enemy} now={now} />
      ))}
    </section>,
    host,
  );
}
