import { Link } from "@tanstack/react-router";
import { CatalogNotFound } from "@/components/catalog/catalog-not-found";
import { t } from "@/i18n/messages";
import { EMPTY_ITEMS_SEARCH } from "@/navigation/wiki-navigation";

export function ItemNotFound() {
  return (
    <CatalogNotFound
      title={t("catalog.itemNotFound")}
      backLink={<Link to="/items" search={EMPTY_ITEMS_SEARCH} />}
      backLabel={t("catalog.backToItems")}
    />
  );
}
