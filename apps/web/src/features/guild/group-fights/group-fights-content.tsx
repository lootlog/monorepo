import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGroupFightsControllerGetGuildGroupFightRanking } from "@lootlog/client/main";
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
import { WorldSwitcher } from "@/components/common/world-switcher";
import { GroupFightPeriodSelect } from "./group-fight-period-select";
import { GroupFightNpcs } from "./group-fight-npcs";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@lootlog/ui/components/tabs";
import { GroupFightRanking } from "./group-fight-ranking";
import { GroupFightSummary } from "./group-fight-summary";

export function GroupFightsContent({ guildId }: { guildId: string }) {
  const { t } = useTranslation();
  const [world, setWorld] = useState<string | null>(null);
  const [period, setPeriod] = useState<GroupFightPeriod>("today");
  const [npcType, setNpcType] = useState<"all" | "ELITE2" | "TITAN">("all");
  const [selectedNpcName, setSelectedNpcName] = useState<string | null>(null);
  const filters = {
    world: world ?? undefined,
    period,
    npcType: npcType === "all" ? undefined : npcType,
    npcName: selectedNpcName ?? undefined,
  };
  const ranking = useGroupFightsControllerGetGuildGroupFightRanking(
    { guildId },
    filters,
  );
  const summary = ranking.data?.summary;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
      <Tabs
        value={npcType}
        onValueChange={(value) => {
          if (value === "all" || value === "ELITE2" || value === "TITAN") {
            setNpcType(value);
            setSelectedNpcName(null);
          }
        }}
        className="flex flex-col gap-4"
      >
        <FieldGroup className="flex flex-row flex-wrap items-end gap-3">
          <Field className="w-auto">
            <FieldLabel>{t("groupFights.world")}</FieldLabel>
            <WorldSwitcher
              value={world}
              showAllOption
              onValueChange={(value) => {
                setWorld(value);
                setSelectedNpcName(null);
              }}
            />
          </Field>
          <Field className="w-auto">
            <FieldLabel>{t("groupFights.period")}</FieldLabel>
            <GroupFightPeriodSelect
              value={period}
              onValueChange={(value) => {
                setPeriod(value);
                setSelectedNpcName(null);
              }}
            />
          </Field>
          <Field className="w-auto">
            <FieldLabel>{t("groupFights.mapTypes")}</FieldLabel>
            <TabsList aria-label={t("groupFights.mapTypes")}>
              {(["all", "ELITE2", "TITAN"] as const).map((type) => (
                <TabsTrigger key={type} value={type}>
                  {t(`groupFights.mapType.${type}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Field>
        </FieldGroup>
        <TabsContent value={npcType} className="flex flex-col gap-4">
          {selectedNpcName ? (
            <div className="flex flex-wrap items-center gap-3">
              <p>{t("groupFights.selectedNpc", { name: selectedNpcName })}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedNpcName(null);
                }}
              >
                {t("groupFights.clearNpc")}
              </Button>
            </div>
          ) : null}
          {ranking.isError ? (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-wrap items-center gap-3">
                {t("groupFights.error")}
                <Button
                  variant="outline"
                  onClick={() => {
                    void ranking.refetch();
                  }}
                >
                  {t("groupFights.retry")}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {ranking.isPending ? (
            <p role="status">{t("groupFights.loading")}</p>
          ) : null}
          {summary && !ranking.isError ? (
            <GroupFightSummary summary={summary} />
          ) : null}
          {ranking.data && !ranking.isError ? (
            <GroupFightNpcs
              guildId={guildId}
              filters={filters}
              npcs={ranking.data.npcs}
              selectedNpcName={selectedNpcName ?? undefined}
              onSelect={(npc) => {
                setSelectedNpcName(npc.name);
              }}
              onClear={() => {
                setSelectedNpcName(null);
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
