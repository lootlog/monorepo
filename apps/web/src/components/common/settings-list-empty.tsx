import { EmptyState } from "@/components/common/empty-state";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type SettingsListEmptyProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** The next step, such as clearing the filter or creating the first item. */
  action?: ReactNode;
};

/** What a settings list shows under its toolbar when no tile is left. */
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
