import type { GuildGroupFightRankingResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import {
  Empty,
  EmptyHeader,
  EmptyDescription,
} from "@lootlog/ui/components/empty";

type MapSummary = GuildGroupFightRankingResponseDtoOutput["maps"][number];

export function GroupFightMaps({
  maps,
  selectedMapId,
  onSelect,
}: {
  maps: MapSummary[];
  selectedMapId?: number;
  onSelect: (map: MapSummary) => void;
}) {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="group-fight-maps-title"
      className="flex flex-col gap-3"
    >
      <h2 id="group-fight-maps-title" className="text-lg font-semibold">
        {t("groupFights.mapsTitle")}
      </h2>
      {maps.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyDescription>{t("groupFights.empty")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {maps.map((map) => (
            <Card key={map.mapId}>
              <CardHeader>
                <CardTitle>{map.mapName}</CardTitle>
                <CardDescription>
                  {t(`groupFights.mapType.${map.npcType}`)} ·{" "}
                  {map.npcNames.join(", ")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-2">
                  {(
                    [
                      "totalFights",
                      "wins",
                      "losses",
                      "draws",
                      "totalDurationSeconds",
                    ] as const
                  ).map((key) => (
                    <div key={key}>
                      <dt className="text-sm text-muted-foreground">
                        {t(
                          `groupFights.${key === "totalFights" ? "fights" : key === "totalDurationSeconds" ? "duration" : key}`,
                        )}
                      </dt>
                      <dd>
                        {key === "totalDurationSeconds"
                          ? t("groupFights.seconds", { count: map[key] })
                          : map[key]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
              <CardFooter>
                <Button
                  variant={
                    selectedMapId === map.mapId ? "secondary" : "outline"
                  }
                  aria-pressed={selectedMapId === map.mapId}
                  onClick={() => onSelect(map)}
                >
                  {t("groupFights.selectMap", { name: map.mapName })}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
