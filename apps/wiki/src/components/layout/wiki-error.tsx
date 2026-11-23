import {
  Link,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { PortalError } from "@lootlog/ui/components/portal-error";
import { t } from "@/i18n/messages";

export function WikiError({ reset }: ErrorComponentProps) {
  const router = useRouter();

  const retry = () => {
    reset();
    void router.invalidate();
  };

  return (
    <PortalError
      className="mt-6"
      home={<Link to="/" />}
      onRetry={retry}
      labels={{
        title: t("status.errorTitle"),
        description: t("status.errorDescription"),
        retry: t("status.retry"),
        backHome: t("status.backHome"),
      }}
    />
  );
}
