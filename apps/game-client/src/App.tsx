import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider } from "@/components/theme-provider";
import { SocketProvider } from "@/contexts/socket-context";
import { ErrorBoundary } from "react-error-boundary";
import { AppErrorBoundaryFallback } from "@/features/error-boundary/app-error-boundary-fallback";
import { AppContent } from "@/app-content";
import { disposeSoundPlayback } from "@/lib/sound-playback";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoginWindow } from "@/components/login-window";
import { useLoginWebsiteStore } from "@/hooks/auth/use-login-state";
import { isExtensionClient } from "@/lib/game-client-platform";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState, type ReactNode } from "react";
import { disposeSocket } from "@/lib/socket";
import { resetTransientRuntimeState } from "@/lib/runtime-state";
import { useLogsStore } from "@/store/logs.store";

function App() {
  const session = authClient.useSession();
  const extension = isExtensionClient();
  const userId = session.data?.user.id ?? null;

  // A sign-in proves the cookie reaches this page, so a later sign-out (an
  // expired session, say) must not be blamed on blocked cookies.
  useEffect(() => {
    if (userId !== null)
      useLoginWebsiteStore.setState({ websiteOpened: false });
  }, [userId]);

  const [activeUserId, setActiveUserId] = useState<string | null | undefined>(
    extension ? userId : undefined,
  );

  // Unmount the old session before clearing its projections and starting another.
  useEffect(() => {
    if (
      session.isPending ||
      session.isRefetching ||
      session.error ||
      activeUserId === userId
    )
      return;

    // The first userscript session belongs to the tree already starting up. A
    // confirmed missing one unmounts its socket until the player signs in.
    if (activeUserId !== undefined) {
      disposeSocket();
      disposeSoundPlayback();
      queryClient.clear();
      resetTransientRuntimeState();
      useLogsStore.getState().clearActions();
    }

    // The new tree must wait until the old tree unmounts and its external socket/cache are cleared.
    // eslint-disable-next-line react/set-state-in-effect
    setActiveUserId(userId);
  }, [
    extension,
    session.isPending,
    session.isRefetching,
    session.error,
    activeUserId,
    userId,
  ]);

  const confirmedUserId =
    session.isPending || session.error ? activeUserId : userId;

  const changingUser =
    activeUserId !== undefined && activeUserId !== confirmedUserId;

  const showGame = !changingUser && (!extension || userId !== null);
  const connectGame = activeUserId === undefined || confirmedUserId !== null;

  let content: ReactNode = (
    <ErrorBoundary
      FallbackComponent={AppErrorBoundaryFallback}
      onError={(error) => {
        disposeSoundPlayback();
        console.warn("[ErrorBoundary]", error);
      }}
    >
      <AppContent />
    </ErrorBoundary>
  );

  if (connectGame) content = <SocketProvider>{content}</SocketProvider>;

  if (!showGame) content = extension ? <LoginWindow /> : null;

  // The userscript keeps its overlay while signed out, with the login window on
  // top. A failed recheck of an active session does not interrupt play.
  const showUserscriptLogin =
    !extension &&
    showGame &&
    !session.isPending &&
    userId === null &&
    (!session.error || !activeUserId);

  return (
    <ThemeProvider>
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          {content}
          {showUserscriptLogin ? <LoginWindow /> : null}
        </QueryClientProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
