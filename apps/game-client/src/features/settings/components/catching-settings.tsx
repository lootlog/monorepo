import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
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
            <div className="ll-grid ll-grid-cols-2">
              <div>
                <h4 className="ll-mb-2">Łapanie timerów</h4>
                <div className="ll-flex ll-flex-col ll-gap-1">
                  {guilds?.map((guild) => {
                    return (
                      <div key={guild.id} className="ll-flex ll-gap-2">
                        <Checkbox /> <p>{guild.name}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="ll-mb-2">Łapanie lootu</h4>
                <div className="ll-flex ll-flex-col ll-gap-1">
                  {guilds?.map((guild) => {
                    return (
                      <div key={guild.id} className="ll-flex ll-gap-2">
                        <Checkbox /> <p>{guild.name}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="ll-w-full ll-flex ll-justify-center ll-mt-4">
              <Button className="ll-h-1 ll-text-[12px] ll-border ll-border-gray-400 ll-bg-gray-400/30 hover:ll-bg-gray-400/50 ll-rounded-sm">
                Zapisz
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
