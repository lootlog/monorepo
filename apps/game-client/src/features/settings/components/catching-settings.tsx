import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatchingSettingsForm } from "@/features/settings/components/catching-settings-form";
import { CharacterTile } from "@/components/character-tile";
import { useCharacterList } from "@/hooks/api/use-character-list";

import { useGlobalStore } from "@/store/global.store";

export const CatchingSettings = () => {
  const { data: characterList } = useCharacterList();
  const { characterId } = useGlobalStore((state) => state.gameState);

  return (
    <div className="ll-flex ll-flex-col ll-gap-1 ll-pt-2">
      <h2>Ustawienia łapania lootu i timerów</h2>
      <p className=" ll-text-gray-400">
        Skonfiguruj ustawienia dotyczące łapania lootu i timerów w grze dla
        każdej z postaci.
      </p>
      <label className="ll-mt-1 ll-font-semibold">Wybierz postać:</label>
      <Tabs defaultValue={characterId} className="w-full">
        <TabsList>
          {characterList?.map((character) => (
            <TabsTrigger key={character.id} value={`${character.id}`}>
              <CharacterTile character={character} />
            </TabsTrigger>
          ))}
        </TabsList>
        {characterList?.map((character) => (
          <TabsContent
            key={character.id}
            value={`${character.id}`}
            className="ll-py-2"
          >
            <CatchingSettingsForm characterId={character.id.toString()} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
