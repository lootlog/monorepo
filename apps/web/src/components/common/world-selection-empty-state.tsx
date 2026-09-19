import { WorldSwitcher } from "@/components/common/world-switcher";
import { ThemeEmptyStateIcon } from "@/themes";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lootlog/ui/components/empty";
import { Globe2 } from "lucide-react";

type WorldSelectionEmptyStateProps = {
  title: string;
  description: string;
};

export const WorldSelectionEmptyState = ({
  title,
  description,
}: WorldSelectionEmptyStateProps) => (
  <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 pb-8 pt-5 sm:px-6 md:[align-items:safe_center] md:py-8">
    <Empty className="w-full max-w-sm flex-none bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ThemeEmptyStateIcon fallback=<Globe2 /> />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <WorldSwitcher
          width="w-full"
          triggerClassName="h-11 w-full justify-between px-3"
        />
      </EmptyContent>
    </Empty>
  </div>
);
