import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "@lootlog/ui/lib/toast";

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
  const [isCopying, setIsCopying] = useState(false);

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
        loading={isCopying}
        icon=<Copy />
        onClick={() => {
          if (isCopying) return;
          setIsCopying(true);

          return Promise.resolve()
            .then(() => navigator.clipboard.writeText(url))
            .then(() => {
              toast.success(copiedMessage);
            })
            .catch(() => {
              toast.error(copyErrorMessage);
            })
            .finally(() => setIsCopying(false));
        }}
      >
        {copyLabel}
      </Button>
    </div>
  );
};
