import { Link } from "@tanstack/react-router";
import { CatalogNotFound } from "@/components/catalog/catalog-not-found";
import { t } from "@/i18n/messages";
import { EMPTY_NPCS_SEARCH } from "@/navigation/wiki-navigation";

export function NpcNotFound() {
  return (
    <CatalogNotFound
      title={t("catalog.npcNotFound")}
      backLink={<Link to="/npcs" search={EMPTY_NPCS_SEARCH} />}
      backLabel={t("catalog.backToNpcs")}
    />
  );
}
