import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { t } from "@/i18n/messages";
import { PREVIEW_STATUSES, type FactCounts } from "@/lib/recording-import";

export function RecordingFactCounts({ counts }: { counts: FactCounts }) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="recording-counts">
      <h2 id="recording-counts" className="text-base font-semibold">
        {t("moderation.recordings.countsTitle")}
      </h2>
      <ul className="grid gap-2 sm:hidden">
        {counts.map(({ kind, counts: byStatus }) => (
          <li key={kind} className="flex flex-col gap-2 rounded-xl border p-3">
            <span className="text-sm font-medium">
              {t(`moderation.recordings.kinds.${kind}`)}
            </span>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {PREVIEW_STATUSES.map((status) => (
                <div key={status} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">
                    {t(`moderation.recordings.statuses.${status}`)}
                  </dt>
                  <dd
                    className="tabular-nums text-muted-foreground data-[filled=true]:text-foreground"
                    data-filled={byStatus[status] > 0}
                  >
                    {byStatus[status]}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden rounded-xl border sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("moderation.recordings.kindColumn")}</TableHead>
              {PREVIEW_STATUSES.map((status) => (
                <TableHead key={status} className="text-right">
                  {t(`moderation.recordings.statuses.${status}`)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {counts.map(({ kind, counts: byStatus }) => (
              <TableRow key={kind}>
                <TableCell className="font-medium">
                  {t(`moderation.recordings.kinds.${kind}`)}
                </TableCell>
                {PREVIEW_STATUSES.map((status) => (
                  <TableCell
                    key={status}
                    className="text-right tabular-nums text-muted-foreground data-[filled=true]:text-foreground"
                    data-filled={byStatus[status] > 0}
                  >
                    {byStatus[status]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
