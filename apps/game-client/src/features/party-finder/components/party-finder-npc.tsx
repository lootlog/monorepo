import { CharacterTile } from "@/components/character-tile";
import { NpcTile } from "@/components/npc-tile";
import { usePartyFinderStore } from "@/store/party-finder.store";
import type { FC } from "react";

export const PartyFinderNpc: FC = () => {
  const npc = usePartyFinderStore((s) => s.npc);
  const partyGathering = usePartyFinderStore((s) => s.partyGathering);

  if (!npc && partyGathering) {
    const { character, description, minLvl, maxLvl, world } = partyGathering;

    const characterForTile = {
      id: Number.parseInt(character.characterId),
      nick: character.nick,
      icon: character.icon,
      lvl: character.lvl,
      prof: character.prof,
      world,
    };

    return (
      <div className="ll:flex ll:items-center ll:pb-2 ll:px-2 ll:gap-2 ll:mt-1">
        <div className="">
          <CharacterTile
            character={characterForTile}
            className="ll:h-12 ll:scale-75"
          />
        </div>
        <div>
          <p className="ll:text-[11px]">
            {character.nick} ({character.lvl}
            {character.prof})
          </p>
          {description && (
            <p className="ll:text-[10px] ll:text-gray-400">{description}</p>
          )}
          <p className="ll:text-[10px]">
            {minLvl && maxLvl ? `${minLvl}-${maxLvl} lvl` : world}
          </p>
        </div>
      </div>
    );
  }

  if (!npc) {
    return null;
  }

  const npcForTile = {
    id: npc.id,
    nick: npc.name,
    lvl: npc.lvl,
    prof: npc.prof,
    icon: npc.icon,
    wt: 0,
    x: npc.x ?? 0,
    y: npc.y ?? 0,
    tpl: 0,
    type: 0,
  };

  return (
    <div className="ll:flex ll:items-center ll:pb-2">
      <div>
        <NpcTile npc={npcForTile} className="ll:h-12" />
      </div>
      <div>
        <p className="ll:text-[11px]">{npc.name}</p>
        <p className="ll:text-[10px]">
          {npc.location} - {npc.world}
        </p>
      </div>
    </div>
  );
};
