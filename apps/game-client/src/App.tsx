import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider } from "@/components/theme-provider";
import { SocketProvider } from "@/contexts/socket-context";
import { realtimeAccessPolicyObservers } from "@/composition/feature-observers";
import { ErrorBoundary } from "react-error-boundary";
import { AppErrorBoundaryFallback } from "@/features/error-boundary/app-error-boundary-fallback";
import { AppContent } from "@/app-content";
import { disposeSoundPlayback } from "@/lib/sound-playback";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoginWindow } from "@/components/login-window";
import { useLoginWebsiteStore } from "@/hooks/auth/use-login-state";
import { useReauthenticationStore } from "@/store/reauthentication.store";
import { isExtensionClient } from "@/lib/game-client-platform";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState, type ReactNode } from "react";
import { disposeSocket } from "@/lib/socket";
import { resetTransientRuntimeState } from "@/composition/runtime-state";
import { useLogsStore } from "@/store/logs.store";

function App() {
  const session = authClient.useSession();
  const extension = isExtensionClient();
  const userId = session.data?.user.id ?? null;
  const reauthRequired = useReauthenticationStore((state) => state.required);

  useEffect(() => {
    if (userId !== null)
      useLoginWebsiteStore.setState({ websiteOpened: false });
  }, [userId]);

  const [activeUserId, setActiveUserId] = useState<string | null | undefined>(
    extension ? userId : undefined,
  );

  useEffect(() => {
    if (
      session.isPending ||
      session.isRefetching ||
      session.error ||
      activeUserId === userId
    )
      return;

    if (activeUserId !== undefined) {
      disposeSocket();
      disposeSoundPlayback();
      queryClient.clear();
      resetTransientRuntimeState();
      useLogsStore.getState().clearActions();
    }

    // oxlint-disable-next-line react/set-state-in-effect
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

  if (connectGame)
    content = (
      <SocketProvider accessPolicyObservers={realtimeAccessPolicyObservers}>
        {content}
      </SocketProvider>
    );

  if (!showGame) content = extension ? <LoginWindow /> : null;

  const userscriptSignedOut =
    !extension &&
    !session.isPending &&
    userId === null &&
    (!session.error || !activeUserId);

  const showLogin = showGame && (userscriptSignedOut || reauthRequired);

  return (
    <ThemeProvider>
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          {content}
          {showLogin ? <LoginWindow /> : null}
        </QueryClientProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
