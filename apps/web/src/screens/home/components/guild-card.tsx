import { Avatar, AvatarFallback, AvatarImage } from "components/ui/avatar";
import { Button } from "components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "components/ui/card";
import { Guild } from "hooks/api/use-guild";
import { Link } from "react-router-dom";

type Props = {
  guild: Guild;
};

export const GuildCard: React.FC<Props> = ({ guild }) => {
  return (
    <div
      className="w-72 rounded-2xl"
      style={{
        backgroundImage: `url(${guild.icon})`,
        backgroundSize: "cover",
      }}
    >
      <Card
        key={guild.id}
        className="backdrop-blur bg-background/90 supports-[backdrop-filter]:bg-background/60"
      >
        <CardHeader className="flex justify-center items-center">
          <CardTitle>{guild.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center">
          <Avatar className="h-24 w-24">
            <AvatarImage src={guild.icon as string} />
            <AvatarFallback>{guild.name[0]}</AvatarFallback>
          </Avatar>
        </CardContent>
        <CardFooter className="flex justify-center items-center">
          <Link to={`/${guild.vanityUrl ?? guild.id}`}>
            <Button>Przejdź do lootloga</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};
