import { authClient } from "@/lib/auth-client";
import { PageHeader } from "components/layout/page-header";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "components/ui/scroll-area";
import { usePlayers } from "hooks/api/use-players";
import { useSession } from "hooks/auth/use-session";

import { GuildsList } from "screens/home/components/guilds-list";

export const Home: React.FC = () => {
  const { data: session, isPending } = useSession();
  const isAuthenticated = !!session;

  const { data } = usePlayers();

  console.log(session, data);

  const handleAuthAction = async () => {
    if (isAuthenticated) {
      authClient.signOut({});
    } else {
      await authClient.signIn.social({
        provider: "discord",
        callbackURL: window.location.href,
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader>
        <div className="p-4 flex items-center justify-between w-full">
          <h1 className="font-semibold text-xl p-0">Lootlog</h1>
          <div>
            <Button
              onClick={handleAuthAction}
              className="btn btn-primary"
              disabled={isPending}
            >
              {isAuthenticated ? "Wyloguj się" : "Zaloguj się"}
            </Button>
          </div>
        </div>
      </PageHeader>
      {!isAuthenticated && !isPending && (
        <div className="flex justify-center items-center h-full">
          <p>Zaloguj się, aby wyświetlić listę lootlogów.</p>
        </div>
      )}
      <ScrollArea>{!isPending && isAuthenticated && <GuildsList />}</ScrollArea>
    </div>
  );
};
