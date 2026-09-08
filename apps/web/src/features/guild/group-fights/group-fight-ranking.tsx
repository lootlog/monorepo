import type { GuildGroupFightRankingResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@lootlog/ui/components/table";

export function GroupFightRanking({
  ranking,
}: {
  ranking: GuildGroupFightRankingResponseDtoOutput["ranking"];
}) {
  const { t } = useTranslation();
  return (
    <div
      className="overflow-x-auto"
      role="region"
      aria-label={t("groupFights.ranking")}
      tabIndex={0}
    >
      <Table>
        <TableHeader>
          <TableRow>
            {[
              "member",
              "characters",
              "fights",
              "wins",
              "losses",
              "draws",
              "flees",
              "winRate",
              "time",
            ].map((key) => (
              <TableHead key={key} scope="col">
                {t(`groupFights.${key}`)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranking.map((member) => (
            <TableRow key={member.memberId}>
              <TableHead scope="row">{member.memberName}</TableHead>
              <TableCell>
                <ul className="flex flex-col gap-2">
                  {member.characters.map((character) => (
                    <li key={`${character.world}:${character.characterId}`}>
                      <span>
                        {character.name} ({character.lvl}
                        {character.prof}, {character.world})
                      </span>
                      <p className="text-sm text-muted-foreground">
                        {t("groupFights.characterStats", character)}
                      </p>
                    </li>
                  ))}
                </ul>
              </TableCell>
              <TableCell>{member.fights}</TableCell>
              <TableCell>{member.wins}</TableCell>
              <TableCell>{member.losses}</TableCell>
              <TableCell>{member.draws}</TableCell>
              <TableCell>{member.flees}</TableCell>
              <TableCell>
                {member.winRate.toLocaleString("pl-PL", {
                  maximumFractionDigits: 1,
                })}
                %
              </TableCell>
              <TableCell>
                {t("groupFights.seconds", { count: member.totalSeconds })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
