import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@lootlog/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, type LucideIcon } from "lucide-react";

type SettingsDetailNotFoundProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  backTo: string;
  backLabel: string;
};

export const SettingsDetailNotFound = ({
  icon,
  title,
  description,
  backTo,
  backLabel,
}: SettingsDetailNotFoundProps) => (
  <div className="p-3">
    <EmptyState
      fill
      icon={icon}
      title={title}
      description={description}
      action={
        <Button
          variant="outline"
          nativeButton={false}
          icon=<ArrowLeft className="size-4" />
          render={<Link to={backTo} />}
        >
          {backLabel}
        </Button>
      }
    />
  </div>
);
