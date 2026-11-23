import { TriangleAlertIcon } from "lucide-react";
import type { ReactElement } from "react";
import { Button } from "./button";
import { PageState } from "./page-state";

type PortalErrorProps = {
  home: ReactElement;
  onRetry: () => void;
  className?: string;
  labels: {
    title: string;
    description: string;
    retry: string;
    backHome: string;
  };
};

export function PortalError({
  home,
  onRetry,
  className,
  labels,
}: PortalErrorProps) {
  return (
    <PageState
      className={className}
      icon={<TriangleAlertIcon />}
      title={labels.title}
      description={labels.description}
    >
      <Button onClick={onRetry}>{labels.retry}</Button>
      <Button variant="outline" nativeButton={false} render={home}>
        {labels.backHome}
      </Button>
    </PageState>
  );
}
