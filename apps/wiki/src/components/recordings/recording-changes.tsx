import type { CatalogFactPreviewResponse } from "@lootlog/client/catalog";
import type { ObservedGameFact } from "@lootlog/game-facts/facts";
import { t } from "@/i18n/messages";
import { factChanges, factName } from "@/lib/recording-import";

type RecordingChangesProps = {
  preview: CatalogFactPreviewResponse;
  facts: ReadonlyArray<ObservedGameFact>;
};

export function RecordingChanges({ preview, facts }: RecordingChangesProps) {
  const changed = preview.facts.flatMap((entry) => {
    const incoming = facts[entry.factIndex]?.fact;

    return entry.status === "CHANGED" && entry.current && incoming
      ? [{ entry, incoming, changes: factChanges(entry.current, incoming) }]
      : [];
  });

  if (changed.length === 0) return null;

  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="recording-changes"
    >
      <div className="flex flex-col gap-1">
        <h2 id="recording-changes" className="text-base font-semibold">
          {t("moderation.recordings.changesTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("moderation.recordings.changesDescription")}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {changed.map(({ entry, incoming, changes }) => (
          <li
            key={entry.factIndex}
            className="flex flex-col gap-2 rounded-xl border bg-card p-4"
          >
            <p className="text-sm font-semibold">
              {factName(incoming) ?? ""}{" "}
              <span className="font-normal text-muted-foreground">
                {t("moderation.recordings.changedSubject", {
                  kind: t(`moderation.recordings.kinds.${entry.kind}`),
                  subject: entry.subject,
                })}
              </span>
            </p>
            <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[max-content_1fr]">
              {changes.map(({ field, before, after }) => (
                <div key={field} className="contents">
                  <dt className="font-mono text-muted-foreground">{field}</dt>
                  <dd className="min-w-0 font-mono break-words">
                    <del className="text-destructive">{before}</del>{" "}
                    <ins className="text-foreground no-underline">{after}</ins>
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
