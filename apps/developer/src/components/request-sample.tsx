import { portalText as t } from "~/lib/translations";

type Segment = readonly [text: string, className?: string];

const command = "text-signal-live";

const flag = "text-muted-foreground";

const value = "text-signal-ready";

const number = "text-signal-timer";

const request: Segment[] = [
  ["curl", command],
  [" https://api.lootlog.pl/guilds/$GUILD_ID/timers \\\n"],
  ["  -G -d", flag],
  [" world=fobos \\\n"],
  ["  -H", flag],
  [' "X-Api-Key: $LOOTLOG_API_KEY"'],
];

const response: Segment[] = [
  ['[\n  {\n    "world": '],
  ['"fobos"', value],
  [',\n    "npc": {\n      "name": '],
  ['"Mietek Żul"', value],
  [',\n      "lvl": '],
  ["25", number],
  [',\n      "type": '],
  ['"HERO"', value],
  ['\n    },\n    "minSpawnTime": '],
  ['"2026-11-03T18:42:00.000Z"', value],
  [',\n    "maxSpawnTime": '],
  ['"2026-11-03T18:57:00.000Z"', value],
  ["\n  }\n]"],
];

const codeClassName =
  "overflow-x-auto px-4 py-4 font-mono text-[0.8125rem] leading-6";

const barClassName =
  "flex h-10 items-center justify-between border-border px-4 text-xs font-medium text-muted-foreground";

const renderSegments = (segments: Segment[]) =>
  segments.map(([text, className], index) => (
    // The segments are static, so their position is a stable key.
    // oxlint-disable-next-line react/no-array-index-key
    <span key={index} className={className}>
      {text}
    </span>
  ));

/** A static timers request and its trimmed response for the overview hero. */
export function RequestSample() {
  return (
    <figure className="min-w-0 overflow-hidden rounded-xl border border-border bg-sidebar shadow-lg">
      <figcaption className={`${barClassName} border-b`}>
        <span>{t.sampleRequest}</span>
        <span className="font-mono">GET /guilds/:guildId/timers</span>
      </figcaption>
      <pre className={codeClassName}>
        <code>{renderSegments(request)}</code>
      </pre>
      <div className={`${barClassName} border-y`}>
        <span>{t.sampleResponse}</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-signal-ready">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-signal-ready"
          />
          200 OK
        </span>
      </div>
      <pre className={codeClassName}>
        <code>{renderSegments(response)}</code>
      </pre>
    </figure>
  );
}
