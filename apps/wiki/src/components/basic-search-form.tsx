import type { useBasicSearchForm } from "@/routes/-use-basic-search-form";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
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
      <Label className="grid gap-2">
        <span>{t("search.queryLabel")}</span>
        <Input
          value={queryValue}
          onChange={(event) => setQueryValue(event.target.value)}
          placeholder={t("search.queryPlaceholder")}
        />
      </Label>
      <Label className="grid gap-2">
        <span>{t("search.worldLabel")}</span>
        <Input
          value={worldValue}
          onChange={(event) => setWorldValue(event.target.value)}
          placeholder={t("search.worldPlaceholder")}
        />
      </Label>
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
