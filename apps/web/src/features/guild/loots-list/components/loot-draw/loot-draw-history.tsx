import type { LootDrawResponseDto } from "@lootlog/client/main";
import { Trans, useTranslation } from "react-i18next";
import { MemberIdentity } from "@/components/common/member-identity";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";

export const LootDrawHistory = ({
  draws,
}: {
  draws: readonly LootDrawResponseDto[];
}) => {
  const { t } = useTranslation();

  if (draws.length === 0) return null;

  return (
    <section className="grid gap-2">
      <h3 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("loots.details.draw.history", { count: draws.length })}
      </h3>
      <ul className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border">
        {draws.map((draw) => (
          <li key={draw.id} className="px-3 py-2 text-sm sm:px-4">
            <p className="font-medium text-muted-foreground line-through">
              {t("loots.details.draw.wonBy", {
                name: draw.entrants[draw.winnerIndex]?.name ?? "",
              })}
            </p>
            {draw.voided && (
              <p className="mt-0.5 break-words text-xs text-muted-foreground">
                <Trans
                  i18nKey="loots.details.draw.voidedBy"
                  values={{ date: timestampToDate(draw.voided.at) }}
                  components={{
                    reason: <span>{draw.voided.reason}</span>,
                    member: (
                      <MemberIdentity
                        member={{ memberId: draw.voided.by.id }}
                        fallback={{ name: draw.voided.by.name }}
                        display="name"
                        nameClassName="text-xs font-normal"
                      />
                    ),
                  }}
                />
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
