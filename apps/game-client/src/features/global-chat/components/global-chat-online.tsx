import { useTranslation } from "react-i18next";
import { toWorldOption } from "@/components/world-combobox";
import {
  GLOBAL_CHAT_SHARED_CHANNEL,
  useGlobalChatStore,
} from "@/store/global-chat.store";
import { useGlobalChatChannel } from "../hooks/use-global-chat-channel";

/** Players online on the shown channel's world, or across Lootlog. */
export const GlobalChatOnline = () => {
  const { t } = useTranslation("globalChat");
  const { channel } = useGlobalChatChannel({ loadWorlds: true });

  const stats = useGlobalChatStore((state) =>
    state.stats?.channel === channel ? state.stats : null,
  );

  const onlineLabel =
    stats &&
    (stats.channel === GLOBAL_CHAT_SHARED_CHANNEL
      ? t("stats.onlineLabel", { count: stats.online })
      : t("stats.worldOnlineLabel", {
          count: stats.online,
          world: toWorldOption(stats.channel).label,
        }));

  return (
    <span
      className="ll:flex ll:shrink-0 ll:items-center ll:gap-1 ll:px-1.5 ll:text-[11px] ll:font-semibold ll:tabular-nums ll:text-gray-200"
      title={onlineLabel ?? undefined}
    >
      <span
        aria-hidden
        className="ll:size-1.5 ll:rounded-full ll:bg-green-500"
      />
      <span aria-hidden>{stats ? stats.online : "–"}</span>
      {onlineLabel ? <span className="ll:sr-only">{onlineLabel}</span> : null}
    </span>
  );
};
