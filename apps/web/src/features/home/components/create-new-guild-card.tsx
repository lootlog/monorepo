import { Avatar, AvatarFallback } from "@lootlog/ui/components/avatar";
import { Button } from "@lootlog/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { useGlobalContext } from "@/hooks/use-global-context";

export const CreateNewGuildCard: React.FC = () => {
  const { createGuildModal } = useGlobalContext();

  const handleCreateNewGuild = () => {
    createGuildModal.dispatch({ type: "OPEN" });
  };

  return (
    <div className="w-72 rounded-2xl">
      <Card>
        <CardHeader className="flex justify-center items-center">
          <CardTitle>Nowy</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="text-3xl font-bold">+</AvatarFallback>
          </Avatar>
        </CardContent>
        <CardFooter className="flex justify-center items-center">
          <Button onClick={handleCreateNewGuild}>Dodaj nowego lootloga</Button>
        </CardFooter>
      </Card>
    </div>
  );
};
