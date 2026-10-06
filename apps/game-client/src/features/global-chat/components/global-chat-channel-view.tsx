import { MessageScroller } from "@shadcn/react/message-scroller";
import { useTranslation } from "react-i18next";
import { getApiErrorStatus } from "@lootlog/client/transport";
import { AsyncContent } from "@/components/async-content";
import { NoLootlogEmptyState } from "@/components/no-lootlog-empty-state";
import { useChatAppearanceSettings } from "@/features/settings/persistence/use-appearance-settings";
import {
  GLOBAL_CHAT_SHARED_CHANNEL,
  type GlobalChatChannel,
} from "@/store/global-chat.store";
import { getGlobalChatRows } from "../global-chat.helpers";
import { useGlobalChat } from "../hooks/use-global-chat";
import { GlobalChatInput } from "./global-chat-input";
import { GlobalChatPinned } from "./global-chat-pinned";
import { GlobalChatToolbar } from "./global-chat-toolbar";
import { GlobalChatTranscript } from "./global-chat-transcript";

type GlobalChatChannelViewProps = {
  channel: GlobalChatChannel;
  worlds: ReadonlyArray<string>;
};

/** One channel: its counts and switcher, pinned message, history and input. */
export const GlobalChatChannelView = ({
  channel,
  worlds,
}: GlobalChatChannelViewProps) => {
  const { t } = useTranslation("globalChat");
  const { chatAppearance } = useChatAppearanceSettings();
  const { query, addSentMessage } = useGlobalChat(channel);
  const newest = query.data?.pages[0];
  const viewer = newest?.viewer;

  if (getApiErrorStatus(query.error) === 403) return <NoLootlogEmptyState />;

  const rowContext = {
    channel,
    canModerate: viewer?.isAdmin ?? false,
    showOriginWorld: channel === GLOBAL_CHAT_SHARED_CHANNEL,
  };

  return (
    <div className="ll:flex ll:size-full ll:min-h-0 ll:flex-col">
      <GlobalChatToolbar
        channel={channel}
        worlds={worlds}
        isAdmin={viewer?.isAdmin ?? false}
      />
      {newest?.pinned ? (
        <GlobalChatPinned
          channel={channel}
          message={newest.pinned}
          canUnpin={viewer?.isAdmin ?? false}
        />
      ) : null}
      <div className="ll:relative ll:min-h-0 ll:flex-1 ll:overflow-hidden">
        <AsyncContent
          error={query.data ? null : query.error}
          errorLabel={
            getApiErrorStatus(query.error) === 404
              ? t("errors.channelGone")
              : t("states.loadError")
          }
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
              rowContext={rowContext}
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
      <GlobalChatInput
        channel={channel}
        viewer={viewer}
        onSent={addSentMessage}
        onRefused={() => void query.refetch()}
      />
    </div>
  );
};
