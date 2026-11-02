import { NpcTile } from "@/components/npc-tile";
import { MutedListTab } from "@/features/settings/components/mutes/muted-list-tab";
import {
  useCurrentUserNotificationMutes,
  useUpdateNotificationMutes,
} from "@/features/settings/persistence/use-notification-mutes";
import { useTranslation } from "react-i18next";

export const MutedNpcsSettingsTab = () => {
  const { isReady, mutes } = useCurrentUserNotificationMutes();
  const { mutateFromCurrent } = useUpdateNotificationMutes();
  const { t } = useTranslation();

  return (
    <MutedListTab
      controlId="muted-npcs"
      title={t("settings.mutes.npcsTitle", { count: mutes.npcs.length })}
      searchPlaceholder={t("settings.mutes.npcsSearchPlaceholder")}
      emptyLabel={t("settings.mutes.noNpcs")}
      noResultsLabel={t("settings.mutes.noNpcResults")}
      isReady={isReady}
      items={mutes.npcs}
      getKey={(npc) => npc.npcKey}
      getName={(npc) => npc.name}
      getSearchValues={(npc) => [npc.name, `${npc.lvl}${npc.prof ?? ""}`]}
      renderLeading={(npc) =>
        npc.icon ? (
          // Every sprite gets the same height; the slot is wide enough to
          // keep the names aligned.
          <NpcTile
            npc={{ icon: npc.icon, nick: npc.name }}
            className="ll:h-8 ll:max-h-8 ll:max-w-none ll:rounded-sm"
            containerClassName="ll:h-8 ll:w-10"
          />
        ) : (
          <span aria-hidden className="ll:h-8 ll:w-10" />
        )
      }
      renderTitle={(npc) => (
        <span className="ll:flex ll:min-w-0 ll:gap-1">
          <span className="ll:min-w-0 ll:truncate">{npc.name}</span>
          <span className="ll:shrink-0">
            ({npc.lvl}
            {npc.prof})
          </span>
        </span>
      )}
      onRemove={(npc) =>
        mutateFromCurrent((current) => ({
          npcs: current.npcs.filter(
            (currentNpc) => currentNpc.npcKey !== npc.npcKey,
          ),
        }))
      }
    />
  );
};
