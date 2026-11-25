import type { ReactElement } from "react";
import { Button } from "@lootlog/ui/components/button";
import { PageState } from "@lootlog/ui/components/page-state";
import { SearchXIcon } from "lucide-react";
import { t } from "@/i18n/messages";

export function CatalogNotFound({
  title,
  backLink,
  backLabel,
}: {
  title: string;
  backLink: ReactElement;
  backLabel: string;
}) {
  return (
    <PageState
      className="my-6"
      icon={<SearchXIcon />}
      title={title}
      description={t("catalog.notFoundDescription")}
    >
      <Button nativeButton={false} render={backLink}>
        {backLabel}
      </Button>
    </PageState>
  );
}
