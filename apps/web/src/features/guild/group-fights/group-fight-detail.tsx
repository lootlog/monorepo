import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGroupFightsControllerGetGuildGroupFight } from "@lootlog/client/main";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@lootlog/ui/components/dialog";
import { Button } from "@lootlog/ui/components/button";
import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@lootlog/ui/components/table";

export function GroupFightDetail({
  guildId,
  fightId,
}: {
  guildId: string;
  fightId: number;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const query = useGroupFightsControllerGetGuildGroupFight(
    { guildId, fightId: String(fightId) },
    { query: { enabled: open } },
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        {t("groupFights.inspect", { id: fightId })}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("groupFights.details")}</DialogTitle>
          <DialogDescription>
            {query.data?.mapName} {query.data?.world}
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-4">
          {query.isPending ? (
            <p role="status">{t("groupFights.loading")}</p>
          ) : null}
          {query.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {t("groupFights.error")}
                <Button variant="outline" onClick={() => void query.refetch()}>
                  {t("groupFights.retry")}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {query.data && !query.isError ? (
            <div
              className="overflow-x-auto"
              role="region"
              aria-label={t("groupFights.details")}
              tabIndex={0}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    {["character", "member", "teams", "result", "time"].map(
                      (key) => (
                        <TableHead key={key} scope="col">
                          {t(`groupFights.${key}`)}
                        </TableHead>
                      ),
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.participants.map((participant) => (
                    <TableRow key={participant.characterId}>
                      <TableHead scope="row">
                        {participant.name} ({participant.lvl}
                        {participant.prof})
                      </TableHead>
                      <TableCell>
                        {participant.member?.memberName ?? "—"}
                      </TableCell>
                      <TableCell>
                        {t("groupFights.team", { team: participant.team })}
                      </TableCell>
                      <TableCell>
                        {t(`groupFights.results.${participant.result}`)}
                      </TableCell>
                      <TableCell>
                        {t("groupFights.seconds", {
                          count: participant.participationSeconds,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
          <DialogClose render={<Button variant="outline" />}>
            {t("common.close")}
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
