import { LoadingSlot } from "@/components/common/loading-slot";
import { useTranslation } from "react-i18next";

/** Placeholder for a page section whose shape is unknown until its data arrives. */
export const SectionLoading = () => {
  const { t } = useTranslation();

  return (
    <div role="status" className="flex h-64 items-center justify-center">
      <LoadingSlot size="small" />
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  );
};
