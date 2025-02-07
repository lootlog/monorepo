import { useGuilds } from "hooks/api/use-guilds";
import { CreateNewGuildCard } from "screens/home/components/create-new-guild-card";
import { GuildCard } from "screens/home/components/guild-card";

export const GuildsList: React.FC = () => {
  const { data: guilds } = useGuilds();

  return (
    <div className="h-full w-full">
      <div className="p-4 flex flex-col items-center md:flex-row justify-center md:justify-start flex-wrap gap-4">
        {guilds?.map((guild) => {
          return <GuildCard key={guild.id} guild={guild} />;
        })}
        <CreateNewGuildCard />
      </div>
    </div>
  );
};
