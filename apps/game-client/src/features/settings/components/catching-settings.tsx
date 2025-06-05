import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { CatchingSettingsForm } from "@/features/settings/components/catching-settings-form";
import { useCharacterList } from "@/hooks/api/use-character-list";
import { useGuilds } from "@/hooks/api/use-guilds";

export const CatchingSettings = () => {
  const { data: characterList } = useCharacterList();
  const { data: guilds } = useGuilds();

  return (
    <div className="ll-flex ll-flex-col ll-gap-1 ll-pt-2">
      <h2>Ustawienia łapania lootu i timerów</h2>
      <p className=" ll-text-gray-400">
        Skonfiguruj ustawienia dotyczące łapania lootu i timerów w grze dla
        każdej z postaci.
      </p>
      <label className="ll-mt-1 ll-font-semibold">Wybierz postać:</label>
      <Tabs defaultValue={`${characterList?.[0].id}`} className="w-full">
        <TabsList>
          {characterList?.map((character) => (
            <TabsTrigger key={character.id} value={`${character.id}`}>
              <div
                className={
                  "ll-w-[32px] ll-h-[48px] ll-relative ll-cursor-pointer ll-rounded-lg"
                }
                style={{
                  backgroundImage: `url(${MARGONEM_CDN_CHARACTERS_URL}${character.icon})`,
                }}
              />
            </TabsTrigger>
          ))}
        </TabsList>
        {characterList?.map((character) => (
          <TabsContent
            key={character.id}
            value={`${character.id}`}
            className="ll-py-2"
          >
            <CatchingSettingsForm />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
