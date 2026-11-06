import { Button } from "@lootlog/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { useEffect, useState, type RefObject } from "react";
import { portalText as t } from "~/lib/translations";

/** The new key's secret, shown once; its heading takes focus as it appears. */
export function KeySecretCard({
  secret,
  headingRef,
  onDismiss,
}: {
  secret: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onDismiss: () => void;
}) {
  const [copyState, setCopyState] = useState("");

  useEffect(() => {
    headingRef.current?.focus();
  }, [headingRef]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopyState(t.copied);
    } catch {
      setCopyState(t.copyFailed);
    }
  }

  return (
    <Card aria-labelledby="new-key-secret" className="border-signal-ready/40">
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
        <code className="block break-all rounded-lg border border-border bg-sidebar p-4 font-mono text-sm text-signal-ready">
          {secret}
        </code>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void copy()}>{t.copy}</Button>
          <Button variant="outline" onClick={onDismiss}>
            {t.dismiss}
          </Button>
        </div>
        <p role="status" className="text-sm text-muted-foreground">
          {copyState}
        </p>
      </CardContent>
    </Card>
  );
}
