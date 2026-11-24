import type { CatalogDropSourceDtoOutput } from "@lootlog/client/catalog";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { NpcPortrait } from "@/components/common/npc-portrait";
import { NpcKindLevel } from "@/components/npcs/npc-kind-level";
import { useBossDrops } from "@/hooks/use-new-bosses";
import { npcPageParams } from "@/lib/catalog-links";
import { NewItemsCard } from "./new-items-card";

export function NewMonsterCard({
  monster,
}: {
  monster: CatalogDropSourceDtoOutput;
}) {
  const drops = useBossDrops(monster);

  if (!drops) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <NewItemsCard
      title={monster.name}
      eyebrow={<NpcKindLevel npc={monster} />}
      media={<NpcPortrait icon={monster.icon} size="md" />}
      link={{ to: "/npcs/$npcSlug", params: npcPageParams(monster) }}
      items={drops}
      itemCount={drops.length}
    />
  );
}
