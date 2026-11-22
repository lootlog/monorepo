import { EmptyState } from "@/components/common/empty-state";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type SettingsListEmptyProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export const SettingsListEmpty = ({
  icon,
  title,
  description,
  action,
}: SettingsListEmptyProps) => (
  <div className="p-3">
    <EmptyState
      fill
      icon={icon}
      title={title}
      description={description}
      action={action}
    />
  </div>
);
