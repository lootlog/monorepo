"use client";

import { useSession } from "@/src/hooks/use-session";
import { authClient } from "@/src/lib/auth-client";
import { Button } from "@lootlog/ui/components/button";

export const PageHeader: React.FC = () => {
  const session = useSession();
  const isAuthenticated = !!session.data;

  const handleLoginAction = async () => {
    const url = `${window.location.href}@me`;

    await authClient.signIn.social({
      provider: "discord",
      callbackURL: url,
      scopes: ["guilds.members.read", "guilds", "identify", "email"],
    });
  };

  return (
    <div className="flex flex-row items-center justify-between w-full h-16 px-4 text-white">
      <a href="/" className="text-xl font-bold">
        lootlog.pl
      </a>
      <div className="flex flex-row gap-4">
        {isAuthenticated ? (
          <a href="/@me">
            <Button>Przejdź do lootloga</Button>
          </a>
        ) : (
          <Button onClick={handleLoginAction}>Zaloguj się</Button>
        )}
      </div>
    </div>
  );
};
