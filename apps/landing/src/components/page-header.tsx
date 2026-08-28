import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/src/hooks/use-session";
import { authClient } from "@/src/lib/auth-client";
import { Button } from "@lootlog/ui/components/button";
import { links } from "@/src/config/links";
import { createAuthCallbackUrl } from "@/src/config/auth";

export const PageHeader: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();
  const isAuthenticated = !!session.data;
  const isLoading = session.isPending;

  const handleLoginAction = async () => {
    const url = createAuthCallbackUrl(window.location.origin);

    await authClient.signIn.social({
      provider: "discord",
      callbackURL: url,
      scopes: ["guilds.members.read", "guilds", "identify", "email"],
    });
  };

  return (
    <div className="flex flex-row items-center justify-between w-full h-16 text-white">
      <Link to="/" className="text-xl font-bold">
        {t("landing.header.brand")}
      </Link>
      <div className="flex flex-row gap-4">
        {isLoading ? (
          <Button disabled className="pointer-events-auto">
            <Loader2 className="h-4 w-4 animate-spin" />
          </Button>
        ) : isAuthenticated ? (
          <a href={links.dashboard} className="pointer-events-auto">
            <Button>{t("landing.heroAlt.goToLootlog")}</Button>
          </a>
        ) : (
          <Button className="pointer-events-auto" onClick={handleLoginAction}>
            {t("landing.heroAlt.login")}
          </Button>
        )}
      </div>
    </div>
  );
};
