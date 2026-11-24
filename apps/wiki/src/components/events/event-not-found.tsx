import { Link } from "@tanstack/react-router";
import { CatalogNotFound } from "@/components/catalog/catalog-not-found";
import { t } from "@/i18n/messages";

export function EventNotFound() {
  return (
    <CatalogNotFound
      title={t("catalog.eventNotFound")}
      backLink={<Link to="/events" />}
      backLabel={t("catalog.backToEvents")}
    />
  );
}
