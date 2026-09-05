import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider } from "@/components/theme-provider";
import { SocketProvider } from "@/contexts/socket-context";
import { ErrorBoundary } from "react-error-boundary";
import { AppErrorBoundaryFallback } from "@/features/error-boundary/app-error-boundary-fallback";
import { AppContent } from "@/app-content";
import { disposeSoundPlayback } from "@/lib/sound-playback";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ExtensionLogin } from "@/components/extension-login";
import { isExtensionClient } from "@/lib/game-client-platform";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { disposeSocket } from "@/lib/socket";
import { resetTransientRuntimeState } from "@/lib/runtime-state";
import { useLogsStore } from "@/store/logs.store";

function App() {
  const session = authClient.useSession();
  const extension = isExtensionClient();
  const userId = session.data?.user.id ?? null;
  const [activeUserId, setActiveUserId] = useState(userId);
  // Unmount the old session before clearing its projections and starting another.
  useEffect(() => {
    if (
      !extension ||
      session.isPending ||
      session.error ||
      activeUserId === userId
    )
      return;
    disposeSocket();
    disposeSoundPlayback();
    queryClient.clear();
    resetTransientRuntimeState();
    useLogsStore.getState().clearActions();
    // The new tree must wait until the old tree unmounts and its external socket/cache are cleared.
    // eslint-disable-next-line react/set-state-in-effect
    setActiveUserId(userId);
  }, [extension, session.isPending, session.error, activeUserId, userId]);
  const showGame = !extension || (userId !== null && activeUserId === userId);
  return (
    <ThemeProvider>
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          {showGame ? (
            <SocketProvider>
              <ErrorBoundary
                FallbackComponent={AppErrorBoundaryFallback}
                onError={(error) => {
                  disposeSoundPlayback();
                  console.warn("[ErrorBoundary]", error);
                }}
              >
                <AppContent />
              </ErrorBoundary>
            </SocketProvider>
          ) : (
            <ExtensionLogin />
          )}
        </QueryClientProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
