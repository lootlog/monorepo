import { Link2 } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { CopyStateIcon } from "@lootlog/ui/components/copy-state-icon";
import { useClipboardCopy } from "@lootlog/ui/hooks/use-clipboard-copy";
import { cn } from "cn";
import { t } from "@/i18n/messages";

type ShareLinkButtonProps = {
  path: string;
  params: Readonly<Record<string, string>>;
  compact?: boolean;
  className?: string;
};

export function ShareLinkButton({
  path,
  params,
  compact = false,
  className,
}: ShareLinkButtonProps) {
  const { state, copy } = useClipboardCopy();

  const share = () => {
    const url = new URL(path, window.location.origin);

    for (const [param, value] of Object.entries(params)) {
      url.searchParams.set(param, value);
    }

    return copy(url.toString());
  };

  const label =
    state === "copied"
      ? t("share.copied")
      : state === "failed"
        ? t("share.failed")
        : t("share.share");

  return (
    <Button
      type="button"
      variant={compact ? "ghost" : "outline"}
      size={compact ? "icon-sm" : "sm"}
      className={cn(className)}
      title={compact ? label : undefined}
      onClick={() => void share()}
    >
      <CopyStateIcon state={state} idleIcon={<Link2 aria-hidden="true" />} />
      <span aria-live="polite" className={cn(compact && "sr-only")}>
        {label}
      </span>
    </Button>
  );
}
