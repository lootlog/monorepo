import { CharacterTile } from "@/components/character-tile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationsSettingsTabForm } from "@/features/settings/components/notifications/notifications-settings-tab-form";
import { useCharacterList } from "@/hooks/api/use-character-list";
import { useGlobalStore } from "@/store/global.store";

export const NotificationsSettingsTab = () => {
  const { data: characterList } = useCharacterList();
  const { characterId } = useGlobalStore((state) => state.gameState);

  return (
    <div className="ll-w-full ll-pt-2">
      <h2>Ustawienia powiadomień</h2>
      <p className=" ll-text-gray-400 ll-mb-2">
        Skonfiguruj ustawienia powiadomień dla każdej z postaci. Możesz
        dostosować, które typy NPC będą wywoływać powiadomienia oraz jak będą
        one prezentowane.
      </p>
      <label className="ll-mt-1 ll-font-semibold">Wybierz postać:</label>
      <Tabs defaultValue={characterId} className="w-full">
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
            <NotificationsSettingsTabForm characterId={character.id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
