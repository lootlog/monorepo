import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { useGuildWorld } from "@/hooks/context/use-guild-world";
import { HeaderSlotPortal } from "./header-slot-portal";
import { TopBarItemGroup } from "./top-bar-item-group";

export const GuildWorldHeaderSwitcher = () => {
  const { world, setWorld } = useGuildWorld();
  const isMobile = useIsMobile();

  return (
    <HeaderSlotPortal slot="context">
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
