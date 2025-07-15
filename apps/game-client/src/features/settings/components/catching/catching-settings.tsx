import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CharacterTile } from "@/components/character-tile";
import { useCharacterList } from "@/hooks/api/use-character-list";

import { useGlobalStore } from "@/store/global.store";
import { CatchingSettingsForm } from "@/features/settings/components/catching/catching-settings-form";

export const CatchingSettings = () => {
  const { data: characterList } = useCharacterList();
  const { characterId } = useGlobalStore((state) => state.gameState);

  return (
    <div className="ll-w-full ll-pt-2">
      <h2>Ustawienia łapania lootu i timerów</h2>
      <p className=" ll-text-gray-400 ll-mb-2">
        Skonfiguruj ustawienia dotyczące łapania lootu i timerów w grze dla
        każdej z postaci.
      </p>
      <label className="ll-font-semibold">Wybierz postać:</label>
      <Tabs defaultValue={characterId} className="ll-w-full">
        <TabsList>
          {characterList?.map((character) => (
            <TabsTrigger
              key={character.id}
              value={`${character.id}`}
              className="ll-mr-1"
            >
              <CharacterTile character={character} />
            </TabsTrigger>
          ))}
        </TabsList>
        {characterList?.map((character) => (
          <TabsContent key={character.id} value={`${character.id}`}>
            <CatchingSettingsForm characterId={character.id.toString()} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
