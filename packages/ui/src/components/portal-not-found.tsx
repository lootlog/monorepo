import { CompassIcon } from "lucide-react";
import type { ReactElement } from "react";
import { Button } from "./button";
import { PageState } from "./page-state";

type PortalNotFoundProps = {
  home: ReactElement;
  className?: string;
  labels: {
    title: string;
    description: string;
    backHome: string;
  };
};

export function PortalNotFound({
  home,
  className,
  labels,
}: PortalNotFoundProps) {
  return (
    <PageState
      className={className}
      icon={<CompassIcon />}
      title={labels.title}
      description={labels.description}
    >
      <Button nativeButton={false} render={home}>
        {labels.backHome}
      </Button>
    </PageState>
  );
}
