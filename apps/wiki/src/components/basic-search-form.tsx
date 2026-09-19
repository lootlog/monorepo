import type { useBasicSearchForm } from "@/routes/-use-basic-search-form";
import { Button } from "@lootlog/ui/components/button";
import { SearchTextField } from "@/components/search-text-field";
import { t } from "@/i18n/messages";

export function BasicSearchForm({
  queryValue,
  setQueryValue,
  worldValue,
  setWorldValue,
  handleSubmit,
  handleReset,
}: ReturnType<typeof useBasicSearchForm>) {
  return (
    <form
      className="grid gap-3 md:grid-cols-[1.6fr_1fr_auto_auto]"
      onSubmit={handleSubmit}
    >
      <SearchTextField
        label={t("search.queryLabel")}
        value={queryValue}
        onValueChange={setQueryValue}
        placeholder={t("search.queryPlaceholder")}
      />
      <SearchTextField
        label={t("search.worldLabel")}
        value={worldValue}
        onValueChange={setWorldValue}
        placeholder={t("search.worldPlaceholder")}
      />
      <Button className="self-end" type="submit">
        {t("search.submit")}
      </Button>
      <Button
        className="self-end"
        type="button"
        variant="outline"
        onClick={handleReset}
      >
        {t("search.reset")}
      </Button>
    </form>
  );
}
