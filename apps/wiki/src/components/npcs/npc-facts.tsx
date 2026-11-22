import type { CatalogNpcDtoOutput } from "@lootlog/client/catalog";
import type { ReactNode } from "react";
import { t } from "@/i18n/messages";
import { formatCatalogDay } from "@/lib/catalog-days";
import { npcKind, npcProfession } from "@/lib/npc-summary";

type Fact = { label: string; value: ReactNode };

export function NpcFacts({ npc }: { npc: CatalogNpcDtoOutput }) {
  const kind = npcKind(npc);
  const profession = npcProfession(npc.prof);

  const facts: Fact[] = [
    ...(kind ? [{ label: t("npc.type"), value: kind }] : []),
    ...(profession ? [{ label: t("npc.profession"), value: profession }] : []),
    {
      label: t("item.level"),
      value: npc.lvl > 0 ? npc.lvl : t("npc.elasticLevel"),
    },
    ...(npc.firstSeenOn
      ? [
          {
            label: t("npc.firstSeenOn"),
            value: formatCatalogDay(npc.firstSeenOn),
          },
        ]
      : []),
  ];

  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-3 border-y border-border/60 py-3">
      {facts.map(({ label, value }) => (
        <div key={label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="text-sm font-semibold text-foreground tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
