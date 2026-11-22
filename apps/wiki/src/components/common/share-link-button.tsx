import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { t } from "@/i18n/messages";

type ShareLinkButtonProps = {
  path: string;
  param: string;
  value: string;
  compact?: boolean;
  className?: string;
};

export function ShareLinkButton({
  path,
  param,
  value,
  compact = false,
  className,
}: ShareLinkButtonProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const share = async () => {
    const url = new URL(path, window.location.origin);

    url.searchParams.set(param, value);

    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    setTimeout(() => setCopyState("idle"), 2000);
  };

  const label =
    copyState === "idle" ? t("share.share") : t(`share.${copyState}`);

  return (
    <Button
      type="button"
      variant={compact ? "ghost" : "outline"}
      size={compact ? "icon-sm" : "sm"}
      className={cn(className)}
      title={compact ? label : undefined}
      onClick={() => void share()}
    >
      {copyState === "copied" ? (
        <Check aria-hidden="true" />
      ) : (
        <Link2 aria-hidden="true" />
      )}
      <span aria-live="polite" className={cn(compact && "sr-only")}>
        {label}
      </span>
    </Button>
  );
}
