import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/hooks/auth/use-session";

import { GuildsList } from "@/screens/home/components/guilds-list";
import { UserSidebar } from "@/components/layout/user-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export const Home: React.FC = () => {
  const { data: session, isPending } = useSession();
  const isAuthenticated = !!session;

  // const handleAuthAction = async () => {
  //   if (isAuthenticated) {
  //     authClient.signOut({});
  //   } else {
  //     await authClient.signIn.social({
  //       provider: "discord",
  //       callbackURL: window.location.href,
  //       scopes: ["identify", "email", "guilds"],
  //     });
  //   }
  // };

  return (
    <div className="h-full flex flex-col">
      <SidebarProvider>
        <UserSidebar />
        {!isAuthenticated && !isPending && (
          <div className="flex justify-center items-center h-full">
            <p>Zaloguj się, aby wyświetlić listę lootlogów.</p>
          </div>
        )}
      </SidebarProvider>
      <ScrollArea>{!isPending && isAuthenticated && <GuildsList />}</ScrollArea>
    </div>
  );
};
