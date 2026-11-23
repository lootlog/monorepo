import { FileTextIcon } from "lucide-react";
import { useClipboardCopy } from "../hooks/use-clipboard-copy";
import { Button } from "./button";
import { CopyStateIcon } from "./copy-state-icon";

type PageMarkdownActionsProps = {
  markdownUrl: string;
  labels: {
    copy: string;
    copied: string;
    copyFailed: string;
    view: string;
  };
};

export function PageMarkdownActions({
  markdownUrl,
  labels,
}: PageMarkdownActionsProps) {
  const { state, copyWith } = useClipboardCopy();

  const copy = () =>
    copyWith(async () => {
      const text = fetch(markdownUrl).then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        return new Blob([await response.text()], { type: "text/plain" });
      });

      await navigator.clipboard.write([
        new ClipboardItem({ "text/plain": text }),
      ]);
    });

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
        icon=<CopyStateIcon state={state} />
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
