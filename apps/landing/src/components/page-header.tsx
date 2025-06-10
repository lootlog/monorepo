"use client";

import { useSession } from "@/src/hooks/use-session";
import { authClient } from "@/src/lib/auth-client";
import { Button } from "@lootlog/ui/components/button";

export const PageHeader: React.FC = () => {
  const session = useSession();
  const isAuthenticated = !!session.data;

  const handleLoginAction = async () => {
    await authClient.signIn.social({
      provider: "discord",
      callbackURL: `${window.location.href}/@me`,
      scopes: ["identify", "email", "guilds"],
    });
  };

  return (
    <div className="flex flex-row items-center justify-between w-full h-16 px-4 text-white">
      <h1 className="text-xl font-bold">lootlog.pl</h1>
      <div className="flex flex-row gap-4">
        {isAuthenticated ? (
          <a href="/@me">
            <Button onClick={() => authClient.signOut({})}>
              Przejdź do lootloga
            </Button>
          </a>
        ) : (
          <Button onClick={handleLoginAction}>Zaloguj się</Button>
        )}
      </div>
    </div>
  );
};
