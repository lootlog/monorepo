import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TableCellLink } from "@/components/ui/table-cell-link";

type KillCellLinkProps = {
  guildId: string;
  eventId: string;
  kill: { id: string; heroNpcId: string; heroNpc: { npcName: string } };
  /** The row's keyboard stop, named after the kill. */
  primary: boolean;
  className?: string;
  children: ReactNode;
};

/** One cell of a kill row, opening the kill's details. */
export const KillCellLink = ({
  guildId,
  eventId,
  kill,
  primary,
  className,
  children,
}: KillCellLinkProps) => {
  const { t } = useTranslation();

  return (
    <TableCellLink
      to="/$guildId/events/$eventId/heroes/$heroId/kills/$killId"
      params={{ guildId, eventId, heroId: kill.heroNpcId, killId: kill.id }}
      primary={primary}
      label={t("events.kills.openKillDetails", {
        monsterName: kill.heroNpc.npcName,
      })}
      className={className}
    >
      {children}
    </TableCellLink>
  );
};
