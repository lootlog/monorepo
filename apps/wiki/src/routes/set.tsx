import { createFileRoute } from "@tanstack/react-router";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import { ArticleSection } from "@/components/article/article-section";
import { PageHeader } from "@/components/common/page-header";
import { EquipmentSetHeader } from "@/components/equipment/equipment-set-header";
import { EquipmentSetWindow } from "@/components/equipment/equipment-set-window";
import { useWornItems } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";

export const Route = createFileRoute("/set")({
  component: SetRoute,
  head: () => ({
    meta: [{ title: `${t("equipment.title")} | ${t("meta.title")}` }],
  }),
});

/** The User's whole set: the character window and every worn item. */
function SetRoute() {
  const wornItems = useWornItems();

  return (
    <div className="flex flex-col gap-8 py-6">
      <PageHeader
        title={t("equipment.title")}
        description={t("setPage.description")}
      />
      <section className="flex flex-col gap-5 rounded-xl border border-border/50 bg-card p-5 md:p-6">
        <EquipmentSetHeader titleId="set-page-window" />
        <EquipmentSetWindow />
      </section>
      <ArticleSection
        id="set-page-items"
        title={t("setPage.itemsTitle")}
        count={wornItems.size}
      >
        <CatalogItemGrid
          items={[...wornItems.values()].map(({ item }) => item)}
          isError={false}
          placeholders={0}
          emptyLabel={t("setPage.noItems")}
        />
      </ArticleSection>
    </div>
  );
}
