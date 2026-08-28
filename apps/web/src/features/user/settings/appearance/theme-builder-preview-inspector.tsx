import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ThemePreviewInspection } from "./theme-builder-preview-types";

interface ThemeBuilderPreviewInspectorProps {
  inspection: ThemePreviewInspection;
  onClose: () => void;
}

export const ThemeBuilderPreviewInspector = ({
  inspection,
  onClose,
}: ThemeBuilderPreviewInspectorProps) => {
  const { t } = useTranslation();

  return (
    <aside className="absolute right-3 bottom-3 z-[120] w-[min(22rem,calc(100%-1.5rem))] rounded-xl border border-[#3a465d] bg-[#111723] p-3 text-[#f4f6fb] shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] text-[#9da9bc]">
            {t("settings.appearance.preview.inspectorSlot")}
          </p>
          <p className="font-mono text-sm">
            data-slot=&quot;{inspection.slot}&quot;
          </p>
        </div>
        <button
          type="button"
          className="grid size-8 place-items-center rounded-lg text-[#9da9bc] hover:bg-[#252e3e] hover:text-[#f4f6fb]"
          aria-label={t("common.close")}
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-3 text-[11px] text-[#9da9bc]">
        {t("settings.appearance.preview.inspectorTokens")}
      </p>
      <div className="mt-1 flex flex-wrap gap-1">
        {inspection.tokens.map((token) => (
          <code
            key={token}
            className="rounded-md bg-[#252e3e] px-2 py-1 text-[10px] text-[#d8e2f1]"
          >
            {token}
          </code>
        ))}
      </div>
    </aside>
  );
};
