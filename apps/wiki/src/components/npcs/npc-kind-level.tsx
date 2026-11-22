import { NPC_TYPE_TEXT_CLASS } from "@lootlog/ui/lib/npc-type-colors";
import { npcLevel } from "@/lib/npc-summary";
import { npcKindColorStyle, npcKindLabel, npcKindOf } from "@/lib/npc-types";

type NpcKindLevelProps = {
  npc: {
    type: string | null;
    icon: string | null;
    lvl: number | null;
    prof?: string | null;
  };
};

export function NpcKindLevel({ npc }: NpcKindLevelProps) {
  const kind = npcKindOf(npc);
  const level = npcLevel(npc);
  const color = kind && npcKindColorStyle(kind);

  return (
    <>
      {kind ? (
        <span style={color} className={color ? NPC_TYPE_TEXT_CLASS : undefined}>
          {npcKindLabel(kind)}
        </span>
      ) : null}
      {kind && level ? " · " : null}
      {level ? <span className="tabular-nums">{level}</span> : null}
    </>
  );
}
