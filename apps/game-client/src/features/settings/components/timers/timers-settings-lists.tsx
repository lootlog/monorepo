import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsList } from "@/components/settings/settings-list";
import { SettingsListRow } from "@/components/settings/settings-list-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { IconButton } from "@/components/ui/icon-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TimerListNameForm } from "@/features/timers/components/timer-list-name-form";
import { useTimersStore } from "@/store/timers.store";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";

/**
 * Creates, renames and deletes the player's timer lists and shows which
 * monsters each one holds. Timers join a list from their context menu.
 */
export const TimersSettingsLists: FC = () => {
  const { t } = useTranslation();

  const {
    customLists,
    addCustomList,
    renameCustomList,
    deleteCustomList,
    setTimerListMembership,
  } = useTimersStore(
    useShallow((state) => ({
      customLists: state.customLists,
      addCustomList: state.addCustomList,
      renameCustomList: state.renameCustomList,
      deleteCustomList: state.deleteCustomList,
      setTimerListMembership: state.setTimerListMembership,
    })),
  );

  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const lists = Object.values(customLists);

  return (
    <SettingsTabLayout>
      <SettingsSection
        controlId="timer-lists"
        title={t("settings.timers.lists.title")}
        description={t("settings.timers.lists.description")}
        actions={
          <Popover
            open={openPopover === "add"}
            onOpenChange={(open) => setOpenPopover(open ? "add" : null)}
          >
            <PopoverTrigger asChild>
              <IconButton label={t("settings.timers.lists.addTitle")}>
                <Plus />
              </IconButton>
            </PopoverTrigger>
            <PopoverContent
              role="dialog"
              aria-label={t("settings.timers.lists.addTitle")}
              align="end"
              className="ll:w-[min(320px,calc(100vw-16px))] ll:p-2"
            >
              <TimerListNameForm
                placeholder={t("timers:lists.namePlaceholder")}
                aria-label={t("timers:lists.nameLabel")}
                submitLabel={t("timers:lists.create")}
                autoFocus
                onSubmit={(name) => {
                  addCustomList(name);
                  setOpenPopover(null);
                }}
              />
            </PopoverContent>
          </Popover>
        }
      >
        {lists.length === 0 ? (
          <SettingsEmptyState>
            {t("settings.timers.lists.emptyState")}
          </SettingsEmptyState>
        ) : null}
      </SettingsSection>
      {lists.map((list) => {
        const npcNames = [...list.npcNames].sort((a, b) => a.localeCompare(b));

        return (
          <SettingsSection
            key={list.id}
            title={list.name}
            actions={
              <>
                <Popover
                  open={openPopover === list.id}
                  onOpenChange={(open) => setOpenPopover(open ? list.id : null)}
                >
                  <PopoverTrigger asChild>
                    <IconButton
                      label={`${t("settings.timers.lists.renameTitle")}: ${list.name}`}
                    >
                      <Pencil />
                    </IconButton>
                  </PopoverTrigger>
                  <PopoverContent
                    role="dialog"
                    aria-label={t("settings.timers.lists.renameTitle")}
                    align="end"
                    className="ll:w-[min(320px,calc(100vw-16px))] ll:p-2"
                  >
                    <TimerListNameForm
                      defaultName={list.name}
                      placeholder={t("timers:lists.namePlaceholder")}
                      aria-label={t("timers:lists.nameLabel")}
                      submitLabel={t("settings.timers.lists.renameButton")}
                      autoFocus
                      onSubmit={(name) => {
                        renameCustomList(list.id, name);
                        setOpenPopover(null);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <IconButton
                  label={`${t("settings.timers.lists.deleteTitle")}: ${list.name}`}
                  variant="quiet-destructive"
                  onClick={() => deleteCustomList(list.id)}
                >
                  <Trash2 />
                </IconButton>
              </>
            }
          >
            {npcNames.length > 0 ? (
              <SettingsList>
                {npcNames.map((npcName) => (
                  <SettingsListRow key={npcName} title={npcName}>
                    <IconButton
                      label={`${t("settings.timers.lists.removeTimerTitle")}: ${npcName}`}
                      onClick={() =>
                        setTimerListMembership(list.id, npcName, false)
                      }
                    >
                      <X aria-hidden="true" />
                    </IconButton>
                  </SettingsListRow>
                ))}
              </SettingsList>
            ) : (
              <SettingsEmptyState>
                {t("settings.timers.lists.emptyList")}
              </SettingsEmptyState>
            )}
          </SettingsSection>
        );
      })}
    </SettingsTabLayout>
  );
};
