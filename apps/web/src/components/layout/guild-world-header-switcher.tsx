import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { useGuildWorld } from "@/hooks/context/use-guild-world";
import { HeaderSlotPortal } from "./header-slot-portal";
import { TopBarItemGroup } from "./top-bar-item-group";

/** The Organization's shared world, at the edge of the bar on the pages it scopes. */
export const GuildWorldHeaderSwitcher = () => {
  const { world, setWorld } = useGuildWorld();
  // Phone bars drop control borders: the group's glass frames it.
  const isMobile = useIsMobile();

  return (
    <HeaderSlotPortal slot="context">
      {/* A labelled control keeps a group of its own. */}
      <TopBarItemGroup>
        <WorldSwitcher
          value={world}
          onValueChange={setWorld}
          showAllOption
          size="default"
          variant={isMobile ? "ghost" : "outline"}
          indicator={!isMobile}
          align="end"
          width="w-auto max-w-52"
          iconClassName="text-primary"
          contentClassName="w-48 max-w-none"
        />
      </TopBarItemGroup>
    </HeaderSlotPortal>
  );
};
