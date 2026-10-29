import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { onTestFinished } from "vitest";
import { ChatTranscriptPopups } from "./components/chat-transcript-popups";

export const createChatTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  onTestFinished(() => queryClient.clear());

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ChatTranscriptPopups>
        <div>{children}</div>
      </ChatTranscriptPopups>
    </QueryClientProvider>
  );

  return { queryClient, wrapper };
};
