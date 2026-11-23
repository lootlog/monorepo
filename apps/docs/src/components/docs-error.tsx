import {
  Link,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { PortalError } from "@lootlog/ui/components/portal-error";
import { docsTranslations } from "@/lib/polish-translations";

const t = docsTranslations.status;

export function DocsError({ reset }: ErrorComponentProps) {
  const router = useRouter();

  const retry = () => {
    reset();
    void router.invalidate();
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 md:px-6">
      <PortalError
        home={<Link to="/docs/$" params={{ _splat: "" }} />}
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
