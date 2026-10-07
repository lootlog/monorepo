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
  toWorldOption,
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
 * Players online across Lootlog, a shortcut to the shared channel, the channel
 * switcher and its listeners.
 */
export const GlobalChatToolbar = ({
  channel,
  worlds,
  isAdmin,
}: GlobalChatToolbarProps) => {
  const { t } = useTranslation("globalChat");
  const selectChannel = useGlobalChatStore((state) => state.selectChannel);

  const stats = useGlobalChatStore((state) =>
    state.stats?.channel === channel ? state.stats : null,
  );

  const onlineLabel =
    stats &&
    (channel === GLOBAL_CHAT_SHARED_CHANNEL
      ? t("stats.onlineLabel", { count: stats.online })
      : t("stats.worldOnlineLabel", {
          count: stats.online,
          world: toWorldOption(channel).label,
        }));

  const groups: WorldGroup[] = [
    {
      value: "shared",
      label: t("channels.sharedGroup"),
      items: [
        { value: GLOBAL_CHAT_SHARED_CHANNEL, label: t("channels.shared") },
      ],
    },
    {
      value: "worlds",
      label: t("channels.worldsGroup"),
      items: worlds.map(toWorldOption),
    },
  ];

  return (
    <div className={cn(toolbarStripClassName, "ll:-mt-px ll:shrink-0")}>
      <div className={toolbarStripRowClassName}>
        <span
          className="ll:flex ll:shrink-0 ll:items-center ll:gap-1 ll:px-1.5 ll:text-[11px] ll:font-semibold ll:tabular-nums ll:text-gray-200"
          title={onlineLabel ?? undefined}
        >
          <span
            aria-hidden
            className="ll:size-1.5 ll:rounded-full ll:bg-green-500"
          />
          <span aria-hidden>{stats ? stats.online : "–"}</span>
          {onlineLabel ? (
            <span className="ll:sr-only">{onlineLabel}</span>
          ) : null}
        </span>
        <div
          className={cn(
            toolbarStripDividerClassName,
            "ll:flex ll:shrink-0 ll:items-center ll:px-0.5",
          )}
        >
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
