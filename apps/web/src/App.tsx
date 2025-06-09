import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Navigation } from "./navigation/navigation";

import "@lootlog/ui/globals.css";
import "@/i18n/config";
import { BrowserRouter } from "react-router-dom";
import { GlobalContextProvider } from "@/contexts/global-context";
import { ThemeProvider } from "next-themes";

const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <GlobalContextProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Navigation />
            <ReactQueryDevtools initialIsOpen={false} />
          </BrowserRouter>
        </QueryClientProvider>
      </GlobalContextProvider>
    </ThemeProvider>
  );
}

export default App;
