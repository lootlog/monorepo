import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { storageKey } from "@/lib/storage-key";
import { ThemeProvider } from "@/components/theme-provider";
import { SocketProvider } from "@/contexts/socket-context";
import { ErrorBoundary } from "react-error-boundary";
import { bootstrapPublicApi } from "@/features/public-api";
import { AppErrorBoundaryFallback } from "@/features/error-boundary/app-error-boundary-fallback";
import { AppContent } from "@/app-content";

const THEME_STORAGE_KEY = storageKey("lootlog-theme");

type LootlogApiWindow = Window & {
  __lootlogApiTeardown?: () => void;
};

const lootlogApiWindow = window as LootlogApiWindow;
if (lootlogApiWindow.__lootlogApiTeardown) {
  lootlogApiWindow.__lootlogApiTeardown();
}
lootlogApiWindow.__lootlogApiTeardown = bootstrapPublicApi(queryClient);

function App() {
  return (
    <ThemeProvider defaultTheme="dark-theme" storageKey={THEME_STORAGE_KEY}>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <ErrorBoundary
            FallbackComponent={AppErrorBoundaryFallback}
            onError={(error, _info) => {
              console.error("[ErrorBoundary]", error);
            }}
          >
            <AppContent />
          </ErrorBoundary>
        </SocketProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
