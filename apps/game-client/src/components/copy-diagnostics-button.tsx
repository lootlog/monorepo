import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Check, ClipboardCopy, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type CopyState = "idle" | "success" | "error";

type CopyDiagnosticsButtonProps = {
  /** Builds the text at click time so it reflects the current state. */
  getReport: () => string;
  className?: string;
  variant?: "secondary" | "outline" | "ghost";
};

const COPY_ICON = {
  idle: ClipboardCopy,
  success: Check,
  error: TriangleAlert,
} as const;

/**
 * The one "copy diagnostics" action. It reports the outcome in its own label,
 * so it also works where no toaster is mounted, such as the app error window.
 */
export const CopyDiagnosticsButton: FC<CopyDiagnosticsButtonProps> = ({
  getReport,
  className,
  variant = "outline",
}) => {
  const { t } = useTranslation("common");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const Icon = COPY_ICON[copyState];

  const label = {
    idle: t("diagnostics.copy"),
    success: t("diagnostics.copied"),
    error: t("diagnostics.copyFailed"),
  }[copyState];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getReport());
      setCopyState("success");
    } catch {
      setCopyState("error");
    }
  };

  return (
    <Button
      type="button"
      size="xs"
      variant={variant}
      className={className}
      onClick={() => void handleCopy()}
    >
      <Icon aria-hidden />
      <span aria-live="polite">{label}</span>
    </Button>
  );
};
