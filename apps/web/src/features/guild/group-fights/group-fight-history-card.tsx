import type { GuildGroupFightsResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
} from "@lootlog/ui/components/empty";
import { GroupFightHistory } from "./group-fight-history";

export function GroupFightHistoryCard({
  guildId,
  history,
  cursor,
  pageSize,
  isFetching,
  onCursorChange,
}: {
  guildId: string;
  history: GuildGroupFightsResponseDtoOutput;
  cursor: number;
  pageSize: number;
  isFetching: boolean;
  onCursorChange: (cursor: number) => void;
}) {
  const { t } = useTranslation();
  const hasPrevious = cursor > 0;
  const hasNext = history.pagination.hasNext;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("groupFights.recent")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {history.fights.length > 0 ? (
          <GroupFightHistory guildId={guildId} fights={history.fights} />
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyDescription>{t("groupFights.empty")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        <nav
          aria-label={t("groupFights.recent")}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <Button
            variant="outline"
            disabled={!hasPrevious || isFetching}
            onClick={() => onCursorChange(Math.max(0, cursor - pageSize))}
          >
            {t("groupFights.previous")}
          </Button>
          <span>
            {t("groupFights.page", {
              page: Math.floor(cursor / pageSize) + 1,
            })}
          </span>
          <Button
            variant="outline"
            disabled={!hasNext || isFetching}
            onClick={() => onCursorChange(cursor + pageSize)}
          >
            {t("groupFights.next")}
          </Button>
        </nav>
      </CardContent>
    </Card>
  );
}
