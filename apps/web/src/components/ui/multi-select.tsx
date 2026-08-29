import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@lootlog/ui/components/combobox";
import { Spinner } from "@lootlog/ui/components/spinner";
import { cn } from "@lootlog/ui/lib/utils";
import { useTranslation } from "react-i18next";

const multiSelectVariants = cva(
  "inline-flex min-w-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-primary/25 bg-primary/10 text-foreground hover:bg-primary/15",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        inverted:
          "border-primary/30 bg-primary/15 text-foreground hover:bg-primary/20",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

type MultiSelectOption = {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
};

interface MultiSelectProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange">,
    VariantProps<typeof multiSelectVariants> {
  options: MultiSelectOption[];
  onValueChange: (value: string[]) => void;
  onClose: (value: string[]) => void;
  defaultValue?: string[];
  value?: string[];
  placeholder?: string;
  maxCount?: number;
  modalPopover?: boolean;
  className?: string;
  commandSearch?: boolean;
  controlledSearch?: boolean;
  onSearchChange?: (value: string) => void;
  searchValue?: string;
  loading?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  minimumSearchLength?: number;
  disabled?: boolean;
}

const resolveValue = <Value,>(
  controlledValue: Value | undefined,
  fallback: Value,
) => (controlledValue === undefined ? fallback : controlledValue);

const resolveLabels = ({
  placeholder,
  searchPlaceholder,
  emptyMessage,
  defaultPlaceholder,
  defaultSearchPlaceholder,
  defaultEmptyMessage,
}: {
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  defaultPlaceholder: string;
  defaultSearchPlaceholder: string;
  defaultEmptyMessage: string;
}) => ({
  placeholder: placeholder ?? defaultPlaceholder,
  searchPlaceholder: searchPlaceholder ?? defaultSearchPlaceholder,
  emptyMessage: emptyMessage ?? defaultEmptyMessage,
});

const getInputPlaceholder = ({
  hasSelection,
  hasSearch,
  placeholder,
  searchPlaceholder,
}: {
  hasSelection: boolean;
  hasSearch: boolean;
  placeholder: string;
  searchPlaceholder: string;
}) => {
  if (hasSelection) {
    return undefined;
  }
  return hasSearch ? searchPlaceholder : placeholder;
};

const SelectedValueChips = ({
  options,
  maxCount,
  variant,
}: {
  options: MultiSelectOption[];
  maxCount: number;
  variant: VariantProps<typeof multiSelectVariants>["variant"];
}) => (
  <ComboboxValue>
    {() => (
      <>
        {options.slice(0, maxCount).map((option) => (
          <ComboboxChip
            key={option.value}
            className={cn(multiSelectVariants({ variant }), "h-auto")}
          >
            <span className="max-w-28 truncate">{option.label}</span>
          </ComboboxChip>
        ))}
        {options.length > maxCount ? (
          <span
            className={cn(
              multiSelectVariants({ variant }),
              "border-border bg-transparent text-muted-foreground",
            )}
          >
            +{options.length - maxCount}
          </span>
        ) : null}
      </>
    )}
  </ComboboxValue>
);

const MultiSelectResults = ({
  options,
  loading,
  loadingLabel,
  emptyLabel,
}: {
  options: MultiSelectOption[];
  loading: boolean;
  loadingLabel: string;
  emptyLabel: string;
}) => {
  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center" role="status">
        <Spinner />
        <span className="sr-only">{loadingLabel}</span>
      </div>
    );
  }

  return (
    <>
      {options.length === 0 ? (
        <div
          className="flex min-h-12 items-center justify-center px-4 py-2 text-center text-sm text-muted-foreground"
          role="status"
        >
          {emptyLabel}
        </div>
      ) : null}
      <ComboboxList>
        {options.map((option) => (
          <ComboboxItem key={option.value} value={option.value}>
            {option.icon ? (
              <option.icon className="size-4 shrink-0 text-muted-foreground" />
            ) : null}
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
          </ComboboxItem>
        ))}
      </ComboboxList>
    </>
  );
};

export const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  (
    {
      options,
      onValueChange,
      onClose,
      variant,
      defaultValue = [],
      value,
      placeholder,
      maxCount = 3,
      modalPopover = false,
      commandSearch = false,
      controlledSearch = false,
      onSearchChange,
      searchValue,
      loading = false,
      searchPlaceholder,
      emptyMessage,
      minimumSearchLength = 1,
      disabled = false,
      className,
      ...props
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(searchValue ?? "");
    const selectedValues = resolveValue(value, internalValue);
    const optionCacheRef = React.useRef(new Map<string, MultiSelectOption>());

    for (const option of options) {
      optionCacheRef.current.set(option.value, option);
    }

    React.useEffect(() => {
      if (!open) {
        setInputValue(searchValue ?? "");
      }
    }, [open, searchValue]);

    const resolvedLabels = resolveLabels({
      placeholder,
      searchPlaceholder,
      emptyMessage,
      defaultPlaceholder: t("common.selectOptions"),
      defaultSearchPlaceholder: t("common.search"),
      defaultEmptyMessage: t("common.noResults"),
    });
    const hasSearch = commandSearch || controlledSearch;
    const shouldPromptForSearch =
      controlledSearch && inputValue.length < minimumSearchLength;
    const visibleOptions = shouldPromptForSearch ? [] : options;
    const selectedOptions = selectedValues.map(
      (selectedValue) =>
        optionCacheRef.current.get(selectedValue) ?? {
          label: selectedValue,
          value: selectedValue,
        },
    );
    const promptLabel =
      minimumSearchLength > 1
        ? t("common.searchMinimumCharacters", { count: minimumSearchLength })
        : t("common.startTypingToSearch");
    const resultsEmptyLabel = shouldPromptForSearch
      ? promptLabel
      : resolvedLabels.emptyMessage;

    const updateValue = (nextValue: string[], reason?: string) => {
      if (value === undefined) {
        setInternalValue(nextValue);
      }
      onValueChange(nextValue);

      if (reason === "chip-remove-press" || reason === "clear-press") {
        onClose(nextValue);
      }
    };

    const optionValues = visibleOptions.map((option) => option.value);
    const openCombobox = () => {
      if (!disabled) {
        setOpen(true);
      }
    };

    return (
      <Combobox
        multiple
        value={selectedValues}
        onValueChange={(nextValue, details) =>
          updateValue(nextValue, details.reason)
        }
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && open) {
            onClose(selectedValues);
          }
          setOpen(nextOpen);
        }}
        inputValue={inputValue}
        onInputValueChange={(nextInputValue) => {
          setInputValue(nextInputValue);
          if (controlledSearch) {
            onSearchChange?.(nextInputValue);
          }
        }}
        items={optionValues}
        filteredItems={controlledSearch ? optionValues : undefined}
        itemToStringLabel={(optionValue) =>
          optionCacheRef.current.get(optionValue)?.label ?? optionValue
        }
        disabled={disabled}
        modal={modalPopover}
      >
        <ComboboxChips
          ref={ref}
          {...props}
          className={cn(
            "group min-h-9 w-full cursor-text rounded-xl border-border bg-background px-2.5 py-1.5 text-foreground focus-within:ring-2 focus-within:ring-ring aria-disabled:pointer-events-none aria-disabled:opacity-50",
            className,
          )}
          aria-disabled={disabled}
        >
          <SelectedValueChips
            options={selectedOptions}
            maxCount={maxCount}
            variant={variant}
          />
          <ComboboxChipsInput
            disabled={disabled}
            onClick={openCombobox}
            onFocus={openCombobox}
            placeholder={getInputPlaceholder({
              hasSelection: selectedValues.length > 0,
              hasSearch,
              placeholder: resolvedLabels.placeholder,
              searchPlaceholder: resolvedLabels.searchPlaceholder,
            })}
            aria-label={resolvedLabels.searchPlaceholder}
            className="min-w-20"
          />
          {selectedValues.length > 0 ? (
            <ComboboxClear disabled={disabled} aria-label={t("common.clear")} />
          ) : null}
          <ComboboxTrigger
            disabled={disabled}
            aria-label={resolvedLabels.placeholder}
          />
        </ComboboxChips>
        <ComboboxContent
          className="min-w-64 max-w-[min(24rem,calc(100vw-2rem))] rounded-xl border-border"
          onWheel={(event) => event.stopPropagation()}
        >
          <MultiSelectResults
            options={visibleOptions}
            loading={loading}
            loadingLabel={t("common.loading")}
            emptyLabel={resultsEmptyLabel}
          />
        </ComboboxContent>
      </Combobox>
    );
  },
);

MultiSelect.displayName = "MultiSelect";
