import { cn } from "cn";
import { t } from "@/i18n/messages";

export function SkillPoints({
  spent,
  total,
}: {
  spent: number;
  total: number;
}) {
  return (
    <div aria-live="polite" className="flex min-w-56 flex-1 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
        <span>{t("skills.points")}</span>
        <span className="tabular-nums">
          <strong className="text-sm font-semibold text-foreground">
            {t("skills.pointsValue", { spent, total })}
          </strong>{" "}
          {t("skills.pointsLeft", { left: Math.max(0, total - spent) })}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            spent > total ? "bg-destructive" : "bg-primary",
          )}
          style={{
            width: `${Math.min(100, (spent / Math.max(1, total)) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
