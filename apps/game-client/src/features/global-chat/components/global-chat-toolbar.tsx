import { Globe, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import {
  toolbarStripClassName,
  toolbarStripDividerClassName,
  toolbarStripRowClassName,
} from "@/components/ui/toolbar-strip";
import { IconButton } from "@/components/ui/icon-button";
import {
  getRecentWorldGroups,
  WorldCombobox,
  type WorldGroup,
} from "@/components/world-combobox";
import {
  GLOBAL_CHAT_SHARED_CHANNEL,
  useGlobalChatStore,
  type GlobalChatChannel,
} from "@/store/global-chat.store";
import { GlobalChatMutes } from "./global-chat-mutes";

type GlobalChatToolbarProps = {
  channel: GlobalChatChannel;
  worlds: ReadonlyArray<string>;
  isAdmin: boolean;
};

/**
 * A shortcut to the shared channel, the channel switcher and its listeners.
 */
export const GlobalChatToolbar = ({
  channel,
  worlds,
  isAdmin,
}: GlobalChatToolbarProps) => {
  const { t } = useTranslation("globalChat");
  const selectChannel = useGlobalChatStore((state) => state.selectChannel);
  const recentWorlds = useGlobalChatStore((state) => state.recentWorlds);

  const stats = useGlobalChatStore((state) =>
    state.stats?.channel === channel ? state.stats : null,
  );

  const groups: WorldGroup[] = [
    {
      value: "shared",
      label: t("channels.sharedGroup"),
      items: [
        { value: GLOBAL_CHAT_SHARED_CHANNEL, label: t("channels.shared") },
      ],
    },
    ...getRecentWorldGroups(worlds, recentWorlds, {
      recent: t("worldSelector.recent", { ns: "common" }),
      rest: t("channels.worldsGroup"),
    }),
  ];

  return (
    <div className={cn(toolbarStripClassName, "ll:-mt-px ll:shrink-0")}>
      <div className={toolbarStripRowClassName}>
        <div className="ll:flex ll:shrink-0 ll:items-center ll:px-0.5">
          <IconButton
            label={t("channels.shared")}
            active={channel === GLOBAL_CHAT_SHARED_CHANNEL}
            onClick={() => selectChannel(GLOBAL_CHAT_SHARED_CHANNEL)}
          >
            <Globe aria-hidden className="ll:size-3.5" />
          </IconButton>
        </div>
        <WorldCombobox
          groups={groups}
          value={channel}
          onValueChange={selectChannel}
          placeholder={t("channels.label")}
          variant="strip"
          className={cn(
            toolbarStripDividerClassName,
            "ll:min-w-0 ll:flex-1 ll:border-y-0 ll:bg-transparent ll:data-[size=sm]:h-full",
          )}
        />
        {stats ? (
          <span
            className={cn(
              toolbarStripDividerClassName,
              "ll:flex ll:shrink-0 ll:items-center ll:gap-1 ll:px-1.5 ll:text-[11px] ll:tabular-nums ll:text-gray-300",
            )}
            title={t("stats.listenersLabel", { count: stats.listeners })}
          >
            <Users aria-hidden className="ll:size-3" />
            <span aria-hidden>{stats.listeners}</span>
            <span className="ll:sr-only">
              {t("stats.listenersLabel", { count: stats.listeners })}
            </span>
          </span>
        ) : null}
        {isAdmin ? (
          <div
            className={cn(
              toolbarStripDividerClassName,
              "ll:flex ll:shrink-0 ll:items-center ll:px-0.5",
            )}
          >
            <GlobalChatMutes />
          </div>
        ) : null}
      </div>
    </div>
  );
};
