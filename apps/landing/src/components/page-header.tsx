"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useSession } from "@/src/hooks/use-session";
import { authClient } from "@/src/lib/auth-client";
import { Button } from "@lootlog/ui/components/button";

export const PageHeader: React.FC = () => {
  const session = useSession();
  const isAuthenticated = !!session.data;
  const isLoading = session.isPending;

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
      <Link href="/" className="text-xl font-bold">
        lootlog.pl
      </Link>
      <div className="flex flex-row gap-4">
        {isLoading ? (
          <Button disabled className="pointer-events-auto">
            <Loader2 className="h-4 w-4 animate-spin" />
          </Button>
        ) : isAuthenticated ? (
          <a href="/@me" className="pointer-events-auto">
            <Button>Przejdź do lootloga</Button>
          </a>
        ) : (
          <Button className="pointer-events-auto" onClick={handleLoginAction}>
            Zaloguj się
          </Button>
        )}
      </div>
    </div>
  );
};
