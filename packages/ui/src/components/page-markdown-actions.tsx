import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, FileTextIcon } from "lucide-react";
import { Button } from "./button";

type PageMarkdownActionsProps = {
  markdownUrl: string;
  labels: {
    copy: string;
    copied: string;
    copyFailed: string;
    view: string;
  };
};

type CopyState = "idle" | "copying" | "copied" | "failed";

export function PageMarkdownActions({
  markdownUrl,
  labels,
}: PageMarkdownActionsProps) {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state !== "copied" && state !== "failed") return;
    const timeout = setTimeout(() => setState("idle"), 2000);

    return () => clearTimeout(timeout);
  }, [state]);

  const copy = async () => {
    setState("copying");

    try {
      const text = fetch(markdownUrl).then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        return new Blob([await response.text()], { type: "text/plain" });
      });

      await navigator.clipboard.write([
        new ClipboardItem({ "text/plain": text }),
      ]);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  const copyLabel =
    state === "copied"
      ? labels.copied
      : state === "failed"
        ? labels.copyFailed
        : labels.copy;

  return (
    <div className="not-prose flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        loading={state === "copying"}
        icon={state === "copied" ? <CheckIcon /> : <CopyIcon />}
        onClick={copy}
      >
        <span aria-live="polite">{copyLabel}</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render=<a href={markdownUrl} />
      >
        <FileTextIcon />
        {labels.view}
      </Button>
    </div>
  );
}
