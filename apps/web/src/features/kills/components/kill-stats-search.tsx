import {
  INLINE_SEARCH_INPUT_CLASS,
  InlineSearchField,
} from "@/components/common/inline-search-field";
import { useTranslation } from "react-i18next";

type KillStatsSearchProps = {
  value?: string;
  placeholder: string;
  onChange: (value: string) => void;
};

export const KillStatsSearch = ({
  value,
  placeholder,
  onChange,
}: KillStatsSearchProps) => {
  const { t } = useTranslation();

  return (
    <InlineSearchField
      clearLabel={t("common.clear")}
      onClear={value ? () => onChange("") : undefined}
    >
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INLINE_SEARCH_INPUT_CLASS}
      />
    </InlineSearchField>
  );
};
