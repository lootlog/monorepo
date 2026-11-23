import { Button } from "@lootlog/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { CopyStateIcon } from "@lootlog/ui/components/copy-state-icon";
import { useClipboardCopy } from "@lootlog/ui/hooks/use-clipboard-copy";
import { useEffect, type RefObject } from "react";
import { portalText as t } from "@/lib/translations";

export function KeySecretCard({
  secret,
  headingRef,
  onDismiss,
}: {
  secret: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onDismiss: () => void;
}) {
  const { state, copy } = useClipboardCopy();

  useEffect(() => {
    headingRef.current?.focus();
  }, [headingRef]);

  const copyLabel =
    state === "copied" ? t.copied : state === "failed" ? t.copyFailed : t.copy;

  return (
    <Card
      aria-labelledby="new-key-secret"
      className="animate-rise-in border-signal-ready/40 motion-reduce:animate-none"
    >
      <CardHeader>
        <CardTitle>
          <h2
            id="new-key-secret"
            ref={headingRef}
            tabIndex={-1}
            className="focus-visible:outline-2 focus-visible:outline-primary"
          >
            {t.secretTitle}
          </h2>
        </CardTitle>
        <CardDescription>{t.secret}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <code className="block cursor-text select-all break-all rounded-lg border border-border bg-sidebar p-4 font-mono text-sm text-signal-ready">
          {secret}
        </code>
        <div className="flex flex-wrap gap-2">
          <Button
            loading={state === "copying"}
            icon=<CopyStateIcon state={state} />
            onClick={() => void copy(secret)}
          >
            <span aria-live="polite">{copyLabel}</span>
          </Button>
          <Button variant="outline" onClick={onDismiss}>
            {t.dismiss}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
