import { useTranslation } from "react-i18next";
import { getApiErrorStatus } from "@lootlog/client/transport";
import { AsyncContent } from "@/components/async-content";
import { NoLootlogEmptyState } from "@/components/no-lootlog-empty-state";
import { useGlobalChatChannel } from "../hooks/use-global-chat-channel";
import { GlobalChatChannelView } from "./global-chat-channel-view";

/** Mounted only while the window is open, so it fetches history only then. */
export const GlobalChatContent = () => {
  const { t } = useTranslation("globalChat");

  const { channel, worlds, worldsQuery } = useGlobalChatChannel({
    loadWorlds: true,
  });

  if (getApiErrorStatus(worldsQuery.error) === 403)
    return <NoLootlogEmptyState />;

  return (
    <AsyncContent
      error={worlds ? null : worldsQuery.error}
      errorLabel={t("states.loadError")}
      isLoading={channel === undefined && !worldsQuery.error}
      loadingLabel={t("states.loading")}
      onRetry={() => void worldsQuery.refetch()}
      retryLabel={t("actions.retry", { ns: "common" })}
    >
      {channel !== undefined && worlds ? (
        // A new channel starts with its own history and scroll position.
        <GlobalChatChannelView
          key={channel}
          channel={channel}
          worlds={worlds}
        />
      ) : null}
    </AsyncContent>
  );
};
