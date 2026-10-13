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
        size="sm"
        variant="ghost"
        align="end"
        width="w-auto max-w-52"
        iconClassName="text-primary"
        contentClassName="w-48 max-w-none"
        triggerClassName="rounded-md"
      />
    </HeaderSlotPortal>
  );
};
