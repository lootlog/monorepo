import { MessageScroller } from "@shadcn/react/message-scroller";
import { useTranslation } from "react-i18next";
import { getApiErrorStatus } from "@lootlog/client/transport";
import { AsyncContent } from "@/components/async-content";
import { NoLootlogEmptyState } from "@/components/no-lootlog-empty-state";
import { useChatAppearanceSettings } from "@/features/settings/persistence/use-appearance-settings";
import { getGlobalChatRows } from "../global-chat.helpers";
import { useGlobalChat } from "../hooks/use-global-chat";
import { GlobalChatInput } from "./global-chat-input";
import { GlobalChatTranscript } from "./global-chat-transcript";

/** Mounted only while the window is open, so it fetches and subscribes only then. */
export const GlobalChatContent = () => {
  const { t } = useTranslation("globalChat");
  const { chatAppearance } = useChatAppearanceSettings();
  const { query, addSentMessage } = useGlobalChat();
  const notMember = getApiErrorStatus(query.error) === 403;

  if (notMember) return <NoLootlogEmptyState />;

  return (
    <div className="ll:flex ll:size-full ll:min-h-0 ll:flex-col">
      <div className="ll:relative ll:min-h-0 ll:flex-1 ll:overflow-hidden">
        <AsyncContent
          error={query.data ? null : query.error}
          errorLabel={t("states.loadError")}
          isLoading={query.isPending}
          loadingLabel={t("states.loading")}
          onRetry={() => void query.refetch()}
          retryLabel={t("actions.retry", { ns: "common" })}
        >
          <MessageScroller.Provider
            autoScroll
            defaultScrollPosition="end"
            scrollEdgeThreshold={1}
            scrollPreviousItemPeek={0}
          >
            <GlobalChatTranscript
              appearance={chatAppearance}
              rows={getGlobalChatRows(query.data)}
              hasOlder={query.hasNextPage}
              loadingOlder={query.isFetchingNextPage}
              olderFailed={query.isFetchNextPageError}
              // A paused retry is not "fetching"; joining it keeps retries bounded.
              onLoadOlder={() =>
                void query.fetchNextPage({ cancelRefetch: false })
              }
            />
          </MessageScroller.Provider>
        </AsyncContent>
      </div>
      <GlobalChatInput onSent={addSentMessage} />
    </div>
  );
};
