import { ListPlus } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { ChecklistMenu } from "@/components/checklist-menu";
import { ContextMenuItem } from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  preservePopoverOnMenuPress,
} from "@/components/ui/popover";
import { useTimersStore } from "@/store/timers.store";
import { TimerListNameForm } from "./timer-list-name-form";

type TimerListsPopoverProps = {
  npcName: string;
};

/**
 * Context menu entry that adds the timer's monster to the player's lists or
 * removes it; a new list can be created with the timer already on it.
 */
export const TimerListsPopover: FC<TimerListsPopoverProps> = ({ npcName }) => {
  const { t } = useTranslation("timers");
  const [open, setOpen] = useState(false);

  const { customLists, addCustomList, setTimerListMembership } = useTimersStore(
    useShallow((state) => ({
      customLists: state.customLists,
      addCustomList: state.addCustomList,
      setTimerListMembership: state.setTimerListMembership,
    })),
  );

  const lists = Object.values(customLists);

  const memberOf = new Set(
    lists.filter((list) => list.npcNames.includes(npcName)).map(({ id }) => id),
  );

  return (
    <Popover open={open} onOpenChange={preservePopoverOnMenuPress(setOpen)}>
      <PopoverTrigger asChild>
        <ContextMenuItem
          className="ll:text-white"
          onSelect={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
        >
          <ListPlus className="ll:h-4 ll:w-4 ll:mr-2" />
          {t("contextMenu.lists")}
          {memberOf.size > 0 && (
            <span className="ll:ml-auto ll:pl-2 ll:tabular-nums ll:text-muted-foreground">
              {memberOf.size}
            </span>
          )}
        </ContextMenuItem>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="right"
        className="ll-action-menu ll:w-56 ll:overflow-hidden ll:p-0"
        // Keys would otherwise bubble through the portal to the context menu,
        // whose typeahead swallows the letters typed into the list name.
        // Escape still reaches the popover's document listener.
        onKeyDown={(event) => {
          if (event.key !== "Escape") event.stopPropagation();
        }}
      >
        {lists.length > 0 ? (
          <ChecklistMenu
            aria-label={t("lists.membershipLabel", { name: npcName })}
            items={lists.map((list) => ({ value: list.id, label: list.name }))}
            selected={memberOf}
            // Lists without the monster are the ones to add it to, not
            // switched-off entries.
            dimUnselected={false}
            onToggle={(id) =>
              setTimerListMembership(id, npcName, !memberOf.has(id))
            }
          />
        ) : (
          <p className="ll:m-0 ll:px-2 ll:py-1.5 ll:text-xs ll:text-muted-foreground">
            {t("lists.empty")}
          </p>
        )}
        <div className="ll:border-0 ll:border-t ll:border-gray-400/40 ll:p-1">
          <TimerListNameForm
            placeholder={t("lists.namePlaceholder")}
            aria-label={t("lists.nameLabel")}
            submitLabel={t("lists.create")}
            autoFocus={lists.length === 0}
            onSubmit={(name) => addCustomList(name, [npcName])}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};
