import {
  Link,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { PortalError } from "@lootlog/ui/components/portal-error";
import { text } from "@/lib/messages";

export function AdminError({ reset }: ErrorComponentProps) {
  const router = useRouter();

  const retry = () => {
    reset();
    void router.invalidate();
  };

  return (
    <PortalError
      home={<Link to="/" />}
      onRetry={retry}
      labels={{
        title: text.errorTitle,
        description: text.errorDescription,
        retry: text.retry,
        backHome: text.backHome,
      }}
    />
  );
}
