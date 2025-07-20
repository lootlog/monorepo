import { FullScreenLoading } from "@/components/ui/full-screen-loading";
import { REQUIRED_SCOPES } from "@/constants/required-scopes";
import { useAuthScopes } from "@/hooks/api/use-auth-scopes";
import { useSession } from "@/hooks/auth/use-session";
import { authClient } from "@/lib/auth-client";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@lootlog/ui/components/dialog";

type Props = {
  children: React.ReactNode;
};

export const AuthenticationGuard: React.FC<Props> = ({ children }) => {
  const { data: session, isPending } = useSession();
  const { data: scopes, isPending: isScopesPending } = useAuthScopes();

  if (isPending || isScopesPending) {
    return <FullScreenLoading />;
  }

  if (!session) {
    window.location.href = "/";
  }

  const hasRequiredScopes = REQUIRED_SCOPES.every((scope) =>
    scopes?.includes(scope)
  );

  const handleLoginAction = async () => {
    await authClient.signIn.social({
      provider: "discord",
      callbackURL: window.location.href,
      scopes: REQUIRED_SCOPES,
    });
  };

  return (
    <>
      <Dialog open={!hasRequiredScopes}>
        <DialogContent>
          <DialogTitle>Wymagane ponowne zalogowanie</DialogTitle>
          <DialogDescription>
            Aby kontynuować korzystanie z Lootloga, musisz ponownie się
            zalogować i zaakceptować nowe uprawnienia. Kliknij przycisk poniżej,
            aby przejść do strony logowania.
            <br />
            <br />
            <Button onClick={handleLoginAction}>Zaloguj się ponownie</Button>
          </DialogDescription>
        </DialogContent>
      </Dialog>
      {children}
    </>
  );
};
