import { Link } from "@tanstack/react-router";
import { PortalNotFound } from "@lootlog/ui/components/portal-not-found";
import { t } from "@/i18n/messages";

export function WikiNotFound() {
  return (
    <PortalNotFound
      className="mt-6"
      home={<Link to="/" />}
      labels={{
        title: t("status.notFoundTitle"),
        description: t("status.notFoundDescription"),
        backHome: t("status.backHome"),
      }}
    />
  );
}
