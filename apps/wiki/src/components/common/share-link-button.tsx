import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { t } from "@/i18n/messages";

type ShareLinkButtonProps = {
  /** The page the link opens. */
  path: string;
  /** The query parameter that carries what is shared, and its value. */
  param: string;
  value: string;
  className?: string;
};

/** Copies a link that opens what the player built, saying whether it worked. */
export function ShareLinkButton({
  path,
  param,
  value,
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

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(className)}
      onClick={() => void share()}
    >
      {copyState === "copied" ? (
        <Check aria-hidden="true" />
      ) : (
        <Link2 aria-hidden="true" />
      )}
      <span aria-live="polite">
        {copyState === "idle" ? t("share.share") : t(`share.${copyState}`)}
      </span>
    </Button>
  );
}
