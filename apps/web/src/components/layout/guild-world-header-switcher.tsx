import { WorldSwitcher } from "@/components/common/world-switcher";
import { HeaderSlotPortal } from "./header-slot-portal";

/** The Organization's shared world, shown beside the title of the pages it scopes. */
export const GuildWorldHeaderSwitcher = () => (
  <HeaderSlotPortal slot="context">
    <span aria-hidden="true" className="text-muted-foreground/50">
      ·
    </span>
    <WorldSwitcher
      size="sm"
      variant="ghost"
      align="start"
      width="w-auto max-w-44"
      iconClassName="text-primary"
      contentClassName="w-48 max-w-none"
      triggerClassName="rounded-md"
    />
  </HeaderSlotPortal>
);
