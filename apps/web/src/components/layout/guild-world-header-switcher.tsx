import { WorldSwitcher } from "@/components/common/world-switcher";
import { useGuildWorld } from "@/hooks/context/use-guild-world";
import { HeaderSlotPortal } from "./header-slot-portal";

/** The Organization's shared world, at the edge of the bar on the pages it scopes. */
export const GuildWorldHeaderSwitcher = () => {
  const { world, setWorld } = useGuildWorld();

  return (
    <HeaderSlotPortal slot="context">
      <WorldSwitcher
        value={world}
        onValueChange={setWorld}
        showAllOption
        size="default"
        variant="outline"
        align="end"
        width="w-auto max-w-52"
        iconClassName="text-primary"
        contentClassName="w-48 max-w-none"
        // Matches the view toggle and filters button in the same bar.
        triggerClassName="rounded-md border-border"
      />
    </HeaderSlotPortal>
  );
};
