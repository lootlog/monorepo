import {
  EXTRACTION_SKIPS,
  type ExtractionCoverage,
} from "@lootlog/game-facts/extractor";
import { t } from "@/i18n/messages";

const byFrequency = (entries: ReadonlyArray<readonly [string, number]>) =>
  [...entries].sort(([, a], [, b]) => b - a);

export function RecordingCoverage({
  coverage,
}: {
  coverage: ExtractionCoverage;
}) {
  const groups = [
    {
      label: t("moderation.recordings.unknownPackets"),
      packetKeys: true,
      entries: byFrequency(Object.entries(coverage.unknown)),
    },
    {
      label: t("moderation.recordings.skipped"),
      packetKeys: false,
      entries: byFrequency(
        EXTRACTION_SKIPS.flatMap((skip) => {
          const count = coverage.skipped[skip];

          return count
            ? [[t(`moderation.recordings.skips.${skip}`), count] as const]
            : [];
        }),
      ),
    },
  ].filter(({ entries }) => entries.length > 0);

  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="recording-coverage"
    >
      <div className="flex flex-col gap-1">
        <h2 id="recording-coverage" className="text-base font-semibold">
          {t("moderation.recordings.coverageTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {groups.length === 0
            ? t("moderation.recordings.coverageComplete")
            : t("moderation.recordings.coverageDescription")}
        </p>
      </div>
      {groups.map(({ label, entries, packetKeys }) => (
        <div key={label} className="flex flex-col gap-1.5">
          <h3 className="text-sm font-medium">{label}</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {entries.map(([name, count]) => (
              <li key={name} className="flex justify-between gap-3">
                <span
                  className="min-w-0 break-words data-[packet=true]:font-mono"
                  data-packet={packetKeys}
                >
                  {name}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {t("moderation.recordings.occurrences", { count })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
