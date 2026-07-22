import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { storageKey } from "@/lib/storage-key";
import { ThemeProvider } from "@/components/theme-provider";
import { SocketProvider } from "@/contexts/socket-context";
import { ErrorBoundary } from "react-error-boundary";
import { AppErrorBoundaryFallback } from "@/features/error-boundary/app-error-boundary-fallback";
import { AppContent } from "@/app-content";
import { disposeSoundPlayback } from "@/lib/sound-playback";
import { TooltipProvider } from "@/components/ui/tooltip";
import { captureReactError } from "@/lib/error-monitoring";

const THEME_STORAGE_KEY = storageKey("lootlog-theme");

function App() {
  return (
    <ThemeProvider defaultTheme="dark-theme" storageKey={THEME_STORAGE_KEY}>
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          <SocketProvider>
            <ErrorBoundary
              FallbackComponent={AppErrorBoundaryFallback}
              onError={(error, errorInfo) => {
                captureReactError(error, errorInfo);
                disposeSoundPlayback();
                console.warn("[ErrorBoundary]", error);
              }}
            >
              <AppContent />
            </ErrorBoundary>
          </SocketProvider>
        </QueryClientProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
