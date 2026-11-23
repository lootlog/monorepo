import { EmptyState } from "@lootlog/ui/components/empty-state";
import { Button } from "@lootlog/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, type LucideIcon } from "lucide-react";

type DetailNotFoundProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  backTo: string;
  backSearch?: Record<string, string | undefined>;
  backLabel: string;
};

export const DetailNotFound = ({
  icon,
  title,
  description,
  backTo,
  backSearch,
  backLabel,
}: DetailNotFoundProps) => (
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
          render={<Link to={backTo} search={backSearch} />}
        >
          {backLabel}
        </Button>
      }
    />
  </div>
);
