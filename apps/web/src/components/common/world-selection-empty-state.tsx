import { NoticeCard } from "@/components/common/notice-card";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { ThemeEmptyStateIcon } from "@/themes";
import { Globe2 } from "lucide-react";

type WorldSelectionEmptyStateProps = {
  title: string;
  description: string;
};

export const WorldSelectionEmptyState = ({
  title,
  description,
}: WorldSelectionEmptyStateProps) => (
  <NoticeCard
    icon=<ThemeEmptyStateIcon
      className="size-8 text-primary"
      fallback=<Globe2 className="size-8 text-primary" aria-hidden="true" />
    />
    title={title}
    description={description}
  >
    <WorldSwitcher
      width="w-full"
      triggerClassName="h-11 w-full justify-between px-3"
    />
  </NoticeCard>
);
