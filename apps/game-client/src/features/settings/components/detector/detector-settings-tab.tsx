import { CharacterTile } from "@/components/character-tile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetectorSettingsTabForm } from "@/features/settings/components/detector/detector-settings-tab-form";
import { useCharacterList } from "@/hooks/api/use-character-list";
import { Game } from "@/lib/game";
import type { FC } from "react";

export const DetectorSettingsTab: FC = () => {
  const { data: characterList } = useCharacterList();
  const characterId = String(Game.hero.id);

  return (
    <div className="ll:w-full ll:pt-2">
      <h2 className="ll:text-sm">Ustawienia wykrywacza</h2>
      <p className=" ll:text-gray-400 ll:mb-2">
        Skonfiguruj ustawienia dotyczące wykrywania NPC w grze dla każdej z
        postaci.
      </p>
      <label className="ll:mt-1 ll:font-semibold">Wybierz postać:</label>
      <Tabs defaultValue={characterId} className="w-full">
        <TabsList>
          {characterList?.map((character) => (
            <TabsTrigger key={character.id} value={`${character.id}`}>
              <CharacterTile character={character} />
            </TabsTrigger>
          ))}
        </TabsList>
        {characterList?.map((character) => (
          <TabsContent key={character.id} value={`${character.id}`}>
            <DetectorSettingsTabForm characterId={character.id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
