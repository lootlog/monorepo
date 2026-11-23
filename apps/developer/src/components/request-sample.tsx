import { Button } from "@lootlog/ui/components/button";
import { CopyStateIcon } from "@lootlog/ui/components/copy-state-icon";
import { useClipboardCopy } from "@lootlog/ui/hooks/use-clipboard-copy";
import { useEffect, useRef, useState } from "react";
import { portalText as t } from "@/lib/translations";

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

const requestText = request.map(([text]) => text).join("");

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
  segments.map(([text, className]) => (
    <span key={text} className={className}>
      {text}
    </span>
  ));

export function RequestSample() {
  const { state, copy } = useClipboardCopy();
  const status = useRef<HTMLSpanElement>(null);
  const [statusSeen, setStatusSeen] = useState(false);

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- IntersectionObserver that reveals the response status once it is fully on screen
  useEffect(() => {
    const element = status.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        setStatusSeen(true);
        observer.disconnect();
      },
      { threshold: 1 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <figure className="min-w-0 overflow-hidden rounded-xl border border-border bg-sidebar shadow-lg">
      <figcaption className={`${barClassName} border-b`}>
        <span>{t.sampleRequest}</span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono">
            GET /guilds/:guildId/timers
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            className="-mr-1.5 shrink-0"
            aria-label={t.copyRequest}
            loading={state === "copying"}
            icon=<CopyStateIcon state={state} />
            onClick={() => void copy(requestText)}
          />
          <span aria-live="polite" className="sr-only">
            {state === "copied"
              ? t.copied
              : state === "failed"
                ? t.copyFailed
                : ""}
          </span>
        </span>
      </figcaption>
      <pre className={codeClassName}>
        <code>{renderSegments(request)}</code>
      </pre>
      <div className={`${barClassName} border-y`}>
        <span>{t.sampleResponse}</span>
        <span
          ref={status}
          className="inline-flex items-center gap-1.5 font-mono text-signal-ready"
        >
          <span
            aria-hidden="true"
            className={`size-1.5 rounded-full bg-signal-ready ${statusSeen ? "animate-pop-in motion-reduce:animate-none" : ""}`}
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
