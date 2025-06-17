import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CharacterTile } from "@/components/character-tile";
import { HiddenTimers } from "@/features/settings/components/hidden-timers";
import { useCharacterList } from "@/hooks/api/use-character-list";
import { useGlobalStore } from "@/store/global.store";

export const HiddenTimersTab = () => {
  const { data: characterList } = useCharacterList();
  const { characterId } = useGlobalStore((state) => state.gameState);

  return (
    <div className="ll-flex ll-flex-col ll-gap-1 ll-pt-2">
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
            <HiddenTimers characterId={character.id.toString()} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
