import { Link } from "@tanstack/react-router";
import type { CatalogEventDtoOutput } from "@lootlog/client/catalog";
import { formatNumber } from "@lootlog/domain/locale";
import { npcIconUrl } from "@lootlog/domain/npc-icon";
import { t } from "@/i18n/messages";
import { PixelSprite } from "./pixel-sprite";

export function EventPoster({ event }: { event: CatalogEventDtoOutput }) {
  return (
    <Link
      to="/events/$eventSlug"
      params={{ eventSlug: event.slug }}
      className="group/poster relative flex h-72 w-52 flex-col justify-end overflow-hidden rounded-2xl bg-[radial-gradient(80%_55%_at_50%_40%,color-mix(in_oklab,var(--primary)_16%,var(--card)),var(--card))] p-5 outline-none transition-[translate] duration-300 ease-emphasized hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
    >
      <span className="absolute inset-x-0 top-8 flex justify-center">
        {event.boss?.icon ? (
          <PixelSprite
            src={npcIconUrl(event.boss.icon)}
            className="[zoom:2] transition-[scale] duration-300 ease-emphasized group-hover/poster:scale-105 motion-reduce:transition-none"
          />
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-card via-card/85 to-transparent"
      />
      <span className="relative flex flex-col gap-1">
        <span className="text-lg leading-tight font-semibold tracking-[-0.01em] text-foreground">
          {event.name}
        </span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {t("catalog.eventItemCount", {
            count: formatNumber(event.itemCount),
          })}
        </span>
      </span>
    </Link>
  );
}
