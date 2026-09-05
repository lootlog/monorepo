import { Card } from "@lootlog/ui/components/card";
import { t } from "@/i18n/messages";
import type { SearchStatus } from "@/routes/-search-route.utils";

export function SearchStatusCard({
  status,
  empty,
}: {
  status: SearchStatus;
  empty: boolean;
}) {
  if (status === "ready" && !empty) return null;
  const message = status === "ready" ? "noResults" : status;
  return (
    <Card
      className={
        status === "error"
          ? "border-destructive/40 bg-card/40 p-6 text-sm text-destructive"
          : "border-border bg-card/40 p-6 text-sm text-muted-foreground"
      }
    >
      {t(`search.${message}`)}
    </Card>
  );
}
