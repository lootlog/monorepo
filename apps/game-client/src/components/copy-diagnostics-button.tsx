import { useClipboardCopy } from "@lootlog/ui/hooks/use-clipboard-copy";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardCopy } from "lucide-react";
import { CopyStateIcon } from "@/components/copy-state-icon";
import { Button } from "@/components/ui/button";

type CopyDiagnosticsButtonProps = {
  getReport: () => string;
  className?: string;
  variant?: "secondary" | "outline" | "ghost";
};

export const CopyDiagnosticsButton: FC<CopyDiagnosticsButtonProps> = ({
  getReport,
  className,
  variant = "outline",
}) => {
  const { t } = useTranslation("common");
  const { state, copyWith } = useClipboardCopy();

  const label = {
    idle: t("diagnostics.copy"),
    copying: t("diagnostics.copy"),
    copied: t("diagnostics.copied"),
    failed: t("diagnostics.copyFailed"),
  }[state];

  return (
    <Button
      type="button"
      size="xs"
      variant={variant}
      className={className}
      onClick={() =>
        void copyWith(() => navigator.clipboard.writeText(getReport()))
      }
    >
      <CopyStateIcon state={state} IdleIcon={ClipboardCopy} />
      <span aria-live="polite">{label}</span>
    </Button>
  );
};
