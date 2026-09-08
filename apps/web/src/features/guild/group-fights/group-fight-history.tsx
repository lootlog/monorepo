import type { GuildGroupFightsResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@lootlog/ui/components/table";
import { GroupFightDetail } from "./group-fight-detail";

export function GroupFightHistory({
  guildId,
  fights,
}: {
  guildId: string;
  fights: GuildGroupFightsResponseDtoOutput["fights"];
}) {
  const { t } = useTranslation();
  return (
    <div
      className="overflow-x-auto"
      role="region"
      aria-label={t("groupFights.recent")}
      tabIndex={0}
    >
      <Table>
        <TableHeader>
          <TableRow>
            {[
              "date",
              "world",
              "map",
              "teams",
              "result",
              "duration",
              "details",
            ].map((key) => (
              <TableHead key={key} scope="col">
                {t(`groupFights.${key}`)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {fights.map((fight) => (
            <TableRow key={fight.id}>
              <TableCell>
                <time dateTime={fight.startedAt}>
                  {new Date(fight.startedAt).toLocaleString("pl-PL")}
                </time>
              </TableCell>
              <TableCell>{fight.world}</TableCell>
              <TableCell>{fight.mapName}</TableCell>
              <TableCell>
                {fight.teamOneSize} : {fight.teamTwoSize}
              </TableCell>
              <TableCell>{t(`groupFights.results.${fight.result}`)}</TableCell>
              <TableCell>
                {t("groupFights.seconds", { count: fight.durationSeconds })}
              </TableCell>
              <TableCell>
                <GroupFightDetail guildId={guildId} fightId={fight.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
