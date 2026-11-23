import type { ClipboardCopyState } from "@lootlog/ui/hooks/use-clipboard-copy";

export function CopyStatusAnnouncement({
  state,
  copiedMessage,
}: {
  state: ClipboardCopyState;
  copiedMessage: string;
}) {
  return (
    <span className="sr-only" aria-live="polite">
      {state === "copied" ? copiedMessage : ""}
    </span>
  );
}
