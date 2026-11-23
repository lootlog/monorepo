import {
  Link,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { PortalError } from "@lootlog/ui/components/portal-error";
import { portalText } from "@/lib/translations";

const t = portalText.status;

export function DeveloperError({ reset }: ErrorComponentProps) {
  const router = useRouter();

  const retry = () => {
    reset();
    void router.invalidate();
  };

  return (
    <main className="portal-page">
      <PortalError
        home={<Link to="/" />}
        onRetry={retry}
        labels={{
          title: t.errorTitle,
          description: t.errorDescription,
          retry: t.retry,
          backHome: t.backHome,
        }}
      />
    </main>
  );
}
