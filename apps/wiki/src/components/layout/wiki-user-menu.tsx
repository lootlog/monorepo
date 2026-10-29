import { ExternalLink, LogIn, LogOut, Palette } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useWikiContext } from "@/contexts/wiki-context";
import { useDiscordSignIn } from "@/hooks/use-discord-sign-in";
import { useLogout } from "@/hooks/use-logout";
import { useSession } from "@/hooks/use-session";
import { t } from "@/i18n/messages";

/** Signing in is optional: it brings the User's theme from the Web app. */
export function WikiUserMenu() {
  const { config } = useWikiContext();
  const { session, isPending } = useSession();
  const signIn = useDiscordSignIn();
  const { logout, isPending: isLogoutPending } = useLogout();

  if (isPending) {
    return <Skeleton className="size-8 shrink-0 rounded-full" />;
  }

  if (!session) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="shrink-0"
        disabled={signIn.isPending}
        aria-label={t("userMenu.signIn")}
        title={signIn.hasError ? t("userMenu.signInFailed") : undefined}
        onClick={() => void signIn.signIn()}
      >
        {signIn.isPending ? (
          <Spinner className="size-4" />
        ) : (
          <LogIn aria-hidden="true" />
        )}
        <span className="max-sm:hidden">{t("userMenu.signInShort")}</span>
      </Button>
    );
  }

  const { user } = session;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={t("userMenu.open", { name: user.name })}
            className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      >
        <Avatar className="size-8">
          <AvatarImage src={user.image ?? ""} alt="" />
          <AvatarFallback>{user.name[0] ?? ""}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-64 overflow-hidden rounded-xl p-0"
      >
        <div className="flex min-w-0 flex-col gap-1.5 p-3">
          <span className="truncate text-sm font-semibold leading-none">
            {user.name}
          </span>
          {user.email && (
            <span className="truncate text-xs leading-none text-muted-foreground">
              {user.email}
            </span>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="flex flex-col gap-0.5 p-1.5">
          <DropdownMenuItem
            render={<a href={config.webAppUrl} />}
            className="rounded-lg px-2.5 py-2"
          >
            <ExternalLink />
            {t("userMenu.openLootlog")}
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<a href={`${config.webAppUrl}/@me/settings/appearance`} />}
            className="rounded-lg px-2.5 py-2"
          >
            <Palette />
            {t("userMenu.appearance")}
          </DropdownMenuItem>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="p-1.5">
          <DropdownMenuItem
            variant="destructive"
            closeOnClick={false}
            disabled={isLogoutPending}
            onClick={() => void logout()}
            className="rounded-lg px-2.5 py-2"
          >
            {isLogoutPending ? <Spinner className="size-4" /> : <LogOut />}
            {t("userMenu.logout")}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
