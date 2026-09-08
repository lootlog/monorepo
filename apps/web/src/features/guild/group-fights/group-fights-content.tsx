import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useGroupFightsControllerGetGuildGroupFightRanking,
  useGroupFightsControllerGetGuildGroupFights,
} from "@lootlog/client/main";
import type { GroupFightPeriod } from "@lootlog/schema/group-fights";
import { Button } from "@lootlog/ui/components/button";
import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@lootlog/ui/components/card";
import {
  Empty,
  EmptyHeader,
  EmptyDescription,
} from "@lootlog/ui/components/empty";
import { Field, FieldGroup, FieldLabel } from "@lootlog/ui/components/field";
import { PageHeader } from "@/components/common/page-header";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { GroupFightPeriodSelect } from "./group-fight-period-select";
import { GroupFightMaps } from "./group-fight-maps";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@lootlog/ui/components/tabs";
import { GroupFightRanking } from "./group-fight-ranking";
import { GroupFightHistory } from "./group-fight-history";

const PAGE_SIZE = 20;

export function GroupFightsContent({ guildId }: { guildId: string }) {
  const { t } = useTranslation();
  const [world, setWorld] = useState<string | null>(null);
  const [period, setPeriod] = useState<GroupFightPeriod>("today");
  const [npcType, setNpcType] = useState<"all" | "ELITE2" | "TITAN">("all");
  const [selectedMap, setSelectedMap] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [cursor, setCursor] = useState(0);
  const filters = {
    world: world ?? undefined,
    period,
    npcType: npcType === "all" ? undefined : npcType,
    mapId: selectedMap ? String(selectedMap.id) : undefined,
  };
  const ranking = useGroupFightsControllerGetGuildGroupFightRanking(
    { guildId },
    filters,
  );
  const history = useGroupFightsControllerGetGuildGroupFights(
    { guildId },
    { ...filters, cursor: String(cursor), limit: String(PAGE_SIZE) },
  );
  const summary = ranking.data?.summary;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
      <PageHeader
        title={t("groupFights.title")}
        description={t("groupFights.description")}
      />
      <FieldGroup className="flex flex-row flex-wrap gap-3">
        <Field className="w-auto">
          <FieldLabel>{t("groupFights.world")}</FieldLabel>
          <WorldSwitcher
            value={world}
            showAllOption
            onValueChange={(value) => {
              setWorld(value);
              setSelectedMap(null);
              setCursor(0);
            }}
          />
        </Field>
        <Field className="w-auto">
          <FieldLabel>{t("groupFights.period")}</FieldLabel>
          <GroupFightPeriodSelect
            value={period}
            onValueChange={(value) => {
              setPeriod(value);
              setSelectedMap(null);
              setCursor(0);
            }}
          />
        </Field>
      </FieldGroup>
      <p className="text-sm text-muted-foreground">
        {t("groupFights.calendarNote")}
      </p>
      <Tabs
        value={npcType}
        onValueChange={(value) => {
          if (value === "all" || value === "ELITE2" || value === "TITAN") {
            setNpcType(value);
            setSelectedMap(null);
            setCursor(0);
          }
        }}
      >
        <TabsList aria-label={t("groupFights.mapTypes")}>
          {(["all", "ELITE2", "TITAN"] as const).map((type) => (
            <TabsTrigger key={type} value={type}>
              {t(`groupFights.mapType.${type}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={npcType} className="flex flex-col gap-4">
          {selectedMap ? (
            <div className="flex flex-wrap items-center gap-3">
              <p>{t("groupFights.selectedMap", { name: selectedMap.name })}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedMap(null);
                  setCursor(0);
                }}
              >
                {t("groupFights.clearMap")}
              </Button>
            </div>
          ) : null}
          {ranking.isError || history.isError ? (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-wrap items-center gap-3">
                {t("groupFights.error")}
                <Button
                  variant="outline"
                  onClick={() => {
                    void ranking.refetch();
                    void history.refetch();
                  }}
                >
                  {t("groupFights.retry")}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {ranking.isPending || history.isPending ? (
            <p role="status">{t("groupFights.loading")}</p>
          ) : null}
          {summary && !ranking.isError ? (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {(
                [
                  "totalFights",
                  "wins",
                  "losses",
                  "draws",
                  "fullTeamFights",
                  "totalDurationSeconds",
                ] as const
              ).map((key) => (
                <div key={key} className="rounded-lg border p-3">
                  <dt className="text-sm text-muted-foreground">
                    {t(
                      `groupFights.${key === "totalFights" ? "fights" : key === "totalDurationSeconds" ? "duration" : key}`,
                    )}
                  </dt>
                  <dd className="text-xl font-semibold">
                    {key === "totalDurationSeconds"
                      ? t("groupFights.seconds", { count: summary[key] })
                      : summary[key]}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          {ranking.data && !ranking.isError ? (
            <GroupFightMaps
              maps={ranking.data.maps}
              selectedMapId={selectedMap?.id}
              onSelect={(map) => {
                setSelectedMap({ id: map.mapId, name: map.mapName });
                setCursor(0);
              }}
            />
          ) : null}
          {ranking.data && !ranking.isError ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("groupFights.ranking")}</CardTitle>
                <CardDescription>
                  {t("groupFights.rankingDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ranking.data.ranking.length ? (
                  <GroupFightRanking ranking={ranking.data.ranking} />
                ) : (
                  <Empty>
                    <EmptyHeader>
                      <EmptyDescription>
                        {t("groupFights.empty")}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </CardContent>
            </Card>
          ) : null}
          {history.data && !history.isError ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("groupFights.recent")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {history.data.fights.length ? (
                  <GroupFightHistory
                    guildId={guildId}
                    fights={history.data.fights}
                  />
                ) : (
                  <Empty>
                    <EmptyHeader>
                      <EmptyDescription>
                        {t("groupFights.empty")}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
                <nav
                  aria-label={t("groupFights.recent")}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <Button
                    variant="outline"
                    disabled={cursor === 0 || history.isFetching}
                    onClick={() => setCursor(Math.max(0, cursor - PAGE_SIZE))}
                  >
                    {t("groupFights.previous")}
                  </Button>
                  <span>
                    {t("groupFights.page", {
                      page: Math.floor(cursor / PAGE_SIZE) + 1,
                    })}
                  </span>
                  <Button
                    variant="outline"
                    disabled={
                      !history.data.pagination.hasNext || history.isFetching
                    }
                    onClick={() => setCursor(cursor + PAGE_SIZE)}
                  >
                    {t("groupFights.next")}
                  </Button>
                </nav>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
