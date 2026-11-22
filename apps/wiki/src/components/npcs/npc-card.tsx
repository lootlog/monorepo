import { Link } from "@tanstack/react-router";
import type { CatalogNpcDtoOutput } from "@lootlog/client/catalog";
import { NPC_TYPE_TEXT_CLASS } from "@lootlog/ui/lib/npc-type-colors";
import { cn } from "cn";
import { CalendarPlus, MapPin } from "lucide-react";
import { NpcPortrait } from "@/components/common/npc-portrait";
import { HighlightedText } from "@/components/highlighted-text";
import { TruncatedText } from "@/components/truncated-text";
import { t } from "@/i18n/messages";
import { formatCatalogDay, formatCatalogDayShort } from "@/lib/catalog-days";
import { npcPageParams } from "@/lib/catalog-links";
import { npcLevel } from "@/lib/npc-summary";
import { npcKindColorStyle, npcKindLabel, npcKindOf } from "@/lib/npc-types";

type NpcCardProps = {
  npc: CatalogNpcDtoOutput;
  highlight?: string;
};

export function NpcCard({ npc, highlight = "" }: NpcCardProps) {
  const kind = npcKindOf(npc);
  const color = kind && npcKindColorStyle(kind);
  const level = npcLevel(npc);
  const map = npc.locations[0]?.map;

  return (
    <article
      style={color}
      className="relative flex h-full min-w-0 items-center gap-2.5 rounded-md border border-border/50 bg-card px-2.5 py-2 transition-colors duration-150 hover:border-border hover:bg-accent/30 motion-reduce:transition-none"
    >
      <NpcPortrait key={npc.icon} icon={npc.icon} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to="/npcs/$npcSlug"
          params={npcPageParams(npc)}
          className={cn(
            "flex min-w-0 text-sm/tight font-semibold outline-none after:absolute after:inset-0 after:rounded-md hover:underline focus-visible:underline focus-visible:after:ring-2 focus-visible:after:ring-ring",
            color ? NPC_TYPE_TEXT_CLASS : "text-foreground",
          )}
        >
          <TruncatedText label={npc.name}>
            <HighlightedText text={npc.name} query={highlight} />
          </TruncatedText>
        </Link>
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {level ? (
            <span className="shrink-0 tabular-nums">{level}</span>
          ) : null}
          {kind ? <span className="truncate">{npcKindLabel(kind)}</span> : null}
        </div>
        {map || npc.firstSeenOn ? (
          <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            {map ? (
              <>
                <MapPin aria-hidden="true" className="size-3 shrink-0" />
                <TruncatedText label={map} className="min-w-0 flex-1" />
              </>
            ) : null}
            {npc.firstSeenOn ? (
              <span
                title={`${t("npc.firstSeenOn")}: ${formatCatalogDay(npc.firstSeenOn)}`}
                className="ml-auto flex shrink-0 items-center gap-1 tabular-nums"
              >
                <CalendarPlus aria-hidden="true" className="size-3" />
                {formatCatalogDayShort(npc.firstSeenOn)}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
    </article>
  );
}
