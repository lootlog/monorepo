import { Button } from "@lootlog/ui/components/button";
import { CopyStateIcon } from "@lootlog/ui/components/copy-state-icon";
import { Input } from "@lootlog/ui/components/input";
import { useClipboardCopy } from "@lootlog/ui/hooks/use-clipboard-copy";
import { toast } from "@lootlog/ui/lib/toast";
import { CopyStatusAnnouncement } from "@/components/common/copy-status-announcement";

type CopyLinkFieldProps = {
  url: string;
  label: string;
  copyLabel: string;
  copiedMessage: string;
  copyErrorMessage: string;
};

export const CopyLinkField = ({
  url,
  label,
  copyLabel,
  copiedMessage,
  copyErrorMessage,
}: CopyLinkFieldProps) => {
  const { state, copy } = useClipboardCopy();
  const isCopying = state === "copying";

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        value={url}
        readOnly
        aria-label={label}
        className="min-w-0 font-mono text-xs"
      />
      <Button
        type="button"
        variant="outline"
        className="shrink-0"
        icon=<CopyStateIcon state={state} />
        disabled={isCopying}
        aria-busy={isCopying}
        onClick={async () => {
          if (isCopying) return;

          if (!(await copy(url))) toast.error(copyErrorMessage);
        }}
      >
        {copyLabel}
      </Button>
      <CopyStatusAnnouncement state={state} copiedMessage={copiedMessage} />
    </div>
  );
};
