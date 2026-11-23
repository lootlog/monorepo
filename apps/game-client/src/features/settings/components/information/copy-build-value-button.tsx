import { useClipboardCopy } from "@lootlog/ui/hooks/use-clipboard-copy";
import { Copy } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { CopyStateIcon } from "@/components/copy-state-icon";
import { IconButton } from "@/components/ui/icon-button";
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";

type CopyBuildValueButtonProps = {
  label: string;
  value: string;
};

export const CopyBuildValueButton: FC<CopyBuildValueButtonProps> = ({
  label,
  value,
}) => {
  const { t } = useTranslation();
  const { state, copy } = useClipboardCopy();

  return (
    <IconButton
      label={t("settings.information.copy", { label })}
      onClick={() => {
        void copy(value).then((copied) =>
          showRuntimeMessage(
            t(
              copied
                ? "settings.information.copied"
                : "settings.information.copyFailed",
            ),
          ),
        );
      }}
    >
      <CopyStateIcon state={state} IdleIcon={Copy} />
    </IconButton>
  );
};
