import { NpcTile } from "@/components/npc-tile";
import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import { SettingsList } from "@/components/settings/settings-list";
import { SettingsListRow } from "@/components/settings/settings-list-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { SearchInput } from "@/components/ui/search-input";
import { matchesMuteSearch } from "@/features/settings/components/mutes/mutes-search";
import {
  useCurrentUserNotificationMutes,
  useUpdateNotificationMutes,
} from "@/features/settings/persistence/use-notification-mutes";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const MutedNpcsSettingsTab = () => {
  const { isReady, mutes } = useCurrentUserNotificationMutes();
  const updateNotificationMutes = useUpdateNotificationMutes();
  const [search, setSearch] = useState("");
  const { t } = useTranslation();
  const isActionsDisabled = !isReady || updateNotificationMutes.isPending;

  const npcs = mutes.npcs
    .filter((npc) =>
      matchesMuteSearch(search, [npc.name, `${npc.lvl}${npc.prof ?? ""}`]),
    )
    .sort((left, right) => left.name.localeCompare(right.name, "pl"));

  return (
    <SettingsTabLayout>
      <search className="ll:flex">
        <SearchInput
          value={search}
          placeholder={t("settings.mutes.npcsSearchPlaceholder")}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch("")}
          clearLabel={t("settings.search.clear")}
        />
      </search>
      <SettingsSection
        controlId="muted-npcs"
        title={t("settings.mutes.npcsTitle", { count: mutes.npcs.length })}
      >
        {npcs.length === 0 ? (
          <SettingsEmptyState>
            {mutes.npcs.length === 0
              ? t("settings.mutes.noNpcs")
              : t("settings.mutes.noNpcResults")}
          </SettingsEmptyState>
        ) : (
          <SettingsList>
            {npcs.map((npc) => (
              <SettingsListRow
                key={npc.npcKey}
                leading={
                  npc.icon ? (
                    // Every sprite gets the same height; the slot is wide
                    // enough to keep the names aligned.
                    <NpcTile
                      npc={{ icon: npc.icon, nick: npc.name }}
                      className="ll:h-10 ll:max-w-none"
                      containerClassName="ll:w-10"
                    />
                  ) : (
                    <span aria-hidden className="ll:h-10 ll:w-10" />
                  )
                }
                title={
                  <span className="ll:flex ll:min-w-0 ll:gap-1">
                    <span className="ll:min-w-0 ll:truncate">{npc.name}</span>
                    <span className="ll:shrink-0">
                      ({npc.lvl}
                      {npc.prof})
                    </span>
                  </span>
                }
              >
                <SettingsIconButton
                  variant="destructive"
                  label={t("settings.mutes.removeLabel", { name: npc.name })}
                  disabled={isActionsDisabled}
                  onClick={() =>
                    updateNotificationMutes.mutate({
                      npcs: mutes.npcs.filter(
                        (currentNpc) => currentNpc.npcKey !== npc.npcKey,
                      ),
                    })
                  }
                >
                  <Trash2 />
                </SettingsIconButton>
              </SettingsListRow>
            ))}
          </SettingsList>
        )}
      </SettingsSection>
    </SettingsTabLayout>
  );
};
