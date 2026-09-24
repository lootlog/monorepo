import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreateManualTimerDtoType,
  type SearchTimersNpcResponseDtoOutput,
} from "@lootlog/client/main";
import { AutocompleteSuggestions } from "@/components/ui/autocomplete-suggestions";
import { getNpcTypeNames } from "@/constants/margonem";
import { cn } from "cn";
import { TimerFormFieldError } from "./timer-form-field-error";
import {
  useAddTimerForm,
  MAX_NPC_NAME_LENGTH,
  MIN_NPC_LEVEL,
  MAX_NPC_LEVEL,
  EMPTY_NPC_TYPE_VALUE,
  MANUAL_TIMER_NPC_TYPES,
  resolveManualTimerNpcType,
  type AddTimerFormProps,
} from "./use-add-timer-form";

const MANUAL_TIMER_NPC_TYPE_TRANSLATION_KEYS = {
  [CreateManualTimerDtoType.ELITE2]: "elite2",
  [CreateManualTimerDtoType.ELITE3]: "elite3",
  [CreateManualTimerDtoType.HERO]: "hero",
  [CreateManualTimerDtoType.TITAN]: "titan",
} as const satisfies Record<(typeof MANUAL_TIMER_NPC_TYPES)[number], string>;

const getFieldErrorMessage = (error?: { message?: string }) => error?.message;

const fieldLabelClassName =
  "ll:mb-0.5 ll:block ll:text-[11px] ll:font-medium ll:text-gray-300";

/** Makes the type select sit in line with the text inputs around it. */
const selectFieldClassName =
  "ll:border-border ll:bg-transparent ll:px-1.5 ll:text-[13px] ll:text-white ll:hover:bg-transparent ll:hover:text-white";

const getSpawnWindowLabel = (
  startDate: string,
  endDate: string,
  invalidRangeLabel: string,
) => {
  const minutes = Math.floor(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 60000,
  );

  return minutes > 0 ? `${minutes}m` : invalidRangeLabel;
};

/**
 * Manual timer form shown as an overlay inside the timers window. The target
 * Lootlog comes from the window's own switcher, so the form only asks for the
 * monster and its respawn window.
 */
export function AddTimerForm(props: AddTimerFormProps) {
  const {
    t,
    isPending,
    searchQuery,
    setSearchQuery,
    showSuggestions,
    setShowSuggestions,
    customDatesEnabled,
    selectedIndex,
    setSelectedIndex,
    selectedNpcRef,
    blurTimeoutRef,
    selectedGuildId,
    npcResults,
    npcSearchFailed,
    npcSearchLoading,
    retryNpcSearch,
    register,
    handleSubmit,
    setValue,
    errors,
    handleNpcSelect,
    handleCustomDatesToggle,
    handleSearchKeyDown,
    onSubmit,
    startDate,
    endDate,
    selectedNpcType,
    nameField,
    hasSearchResults,
    showNoResults,
  } = useAddTimerForm(props);

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="ll:flex ll:min-h-0 ll:w-full ll:flex-1 ll:flex-col"
    >
      <ScrollArea
        data-testid="add-timer-scroll-container"
        className="ll:min-h-0 ll:w-full ll:flex-1"
      >
        <div className="ll:flex ll:w-full ll:flex-col ll:gap-2 ll:px-3 ll:py-2">
          <div className="ll:relative ll:w-full">
            <Label htmlFor="npcSearch" className={fieldLabelClassName}>
              {t("addForm.searchNpcLabel")}
            </Label>
            <Input
              id="npcSearch"
              autoComplete="off"
              autoFocus
              placeholder={t("addForm.searchNpcPlaceholder")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                selectedNpcRef.current = null;
                setShowSuggestions(true);
                setSelectedIndex(-1);
              }}
              onKeyDown={handleSearchKeyDown}
              onBlur={() => {
                if (blurTimeoutRef.current) {
                  clearTimeout(blurTimeoutRef.current);
                }

                blurTimeoutRef.current = setTimeout(() => {
                  setShowSuggestions(false);
                  blurTimeoutRef.current = null;
                }, 200);
              }}
            />
            <AutocompleteSuggestions<SearchTimersNpcResponseDtoOutput>
              items={npcResults ?? []}
              errorMessage={
                showSuggestions && npcSearchFailed
                  ? t("addForm.npcSearchError")
                  : undefined
              }
              isLoading={showSuggestions && npcSearchLoading}
              isOpen={showSuggestions && !!hasSearchResults}
              loadingMessage={t("addForm.npcSearching")}
              onRetry={() => {
                void retryNpcSearch();
              }}
              onSelect={handleNpcSelect}
              selectedIndex={selectedIndex}
              keyExtractor={(npc) => npc.npcId}
              renderItem={(npc, _index, isSelected) => {
                const longname = getNpcTypeNames(npc.type)
                  ? t(`common:npcTypes.${npc.type.toLowerCase()}`)
                  : t("addForm.mobFallback");

                const npcDetails =
                  npc.lvl > 0 && npc.prof
                    ? `${npc.lvl}${npc.prof.charAt(0).toLowerCase()}`
                    : "";

                return (
                  <div
                    className={cn(
                      "ll:border-b ll:border-x-0 ll:border-t-0 ll:border-gray-600/50 ll:px-2 ll:py-1.5 ll:text-xs last:ll:border-b-0",
                      isSelected ? "ll:bg-blue-500/30" : "ll:hover:bg-white/5",
                    )}
                  >
                    <div className="ll:font-semibold ll:text-white">
                      {npc.name}
                    </div>
                    <div className="ll:text-[10px] ll:text-gray-400">
                      {[longname, npcDetails].filter(Boolean).join(" • ")}
                    </div>
                  </div>
                );
              }}
              noResultsMessage={t("addForm.npcNotFound")}
              showNoResults={showNoResults}
            />
          </div>

          <div className="ll:w-full">
            <Label htmlFor="name" className={fieldLabelClassName}>
              {t("addForm.nameLabel")}
            </Label>
            <Input
              id="name"
              autoComplete="off"
              placeholder={t("addForm.namePlaceholder")}
              maxLength={MAX_NPC_NAME_LENGTH}
              {...nameField}
              onChange={(event) => {
                selectedNpcRef.current = null;
                nameField.onChange(event);
              }}
            />
            <TimerFormFieldError message={getFieldErrorMessage(errors.name)} />
          </div>

          <div className="ll:grid ll:w-full ll:grid-cols-2 ll:gap-2">
            <div className="ll:min-w-0">
              <Label htmlFor="lvl" className={fieldLabelClassName}>
                {t("addForm.lvlLabel")}
              </Label>
              <Input
                id="lvl"
                type="number"
                min={MIN_NPC_LEVEL}
                max={MAX_NPC_LEVEL}
                step={1}
                autoComplete="off"
                inputMode="numeric"
                placeholder={t("addForm.lvlPlaceholder")}
                {...register("lvl")}
              />
              <TimerFormFieldError message={getFieldErrorMessage(errors.lvl)} />
            </div>
            <div className="ll:min-w-0">
              <Label htmlFor="npcType" className={fieldLabelClassName}>
                {t("addForm.typeLabel")}
              </Label>
              <Select
                value={selectedNpcType}
                onValueChange={(value) => {
                  setValue("type", resolveManualTimerNpcType(value));
                }}
                disabled={isPending}
              >
                <SelectTrigger
                  id="npcType"
                  size="sm"
                  aria-label={t("addForm.typeLabel")}
                  className={selectFieldClassName}
                >
                  <SelectValue placeholder={t("addForm.typePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_NPC_TYPE_VALUE}>
                    {t("addForm.typePlaceholder")}
                  </SelectItem>
                  {MANUAL_TIMER_NPC_TYPES.map((npcType) => (
                    <SelectItem key={npcType} value={npcType}>
                      {t(
                        `common:npcTypes.${MANUAL_TIMER_NPC_TYPE_TRANSLATION_KEYS[npcType]}`,
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="ll:grid ll:w-full ll:grid-cols-2 ll:gap-2">
            <div className="ll:min-w-0">
              <Label htmlFor="minDuration" className={fieldLabelClassName}>
                {t("addForm.minDurationLabel")}
              </Label>
              <Input
                id="minDuration"
                placeholder={t("addForm.minDurationPlaceholder")}
                autoComplete="off"
                disabled={customDatesEnabled}
                {...register("minDuration")}
              />
              <TimerFormFieldError
                message={getFieldErrorMessage(errors.minDuration)}
              />
            </div>
            <div className="ll:min-w-0">
              <Label htmlFor="maxDuration" className={fieldLabelClassName}>
                {t("addForm.maxDurationLabel")}
              </Label>
              <Input
                id="maxDuration"
                placeholder={t("addForm.maxDurationPlaceholder")}
                autoComplete="off"
                disabled={customDatesEnabled}
                {...register("maxDuration")}
              />
              <TimerFormFieldError
                message={getFieldErrorMessage(errors.maxDuration)}
              />
            </div>
          </div>

          <div className="ll:flex ll:items-center ll:gap-2 ll:pt-1">
            <Switch
              id="customDates"
              checked={customDatesEnabled}
              onCheckedChange={(checked) => handleCustomDatesToggle(checked)}
            />
            <Label
              htmlFor="customDates"
              className="ll:text-[11px] ll:font-medium ll:text-gray-300"
            >
              {t("addForm.customDates")}
            </Label>
          </div>

          {customDatesEnabled && (
            <div className="ll:flex ll:w-full ll:flex-col ll:gap-2">
              <div className="ll:w-full">
                <Label htmlFor="startDate" className={fieldLabelClassName}>
                  {t("addForm.startDateLabel")}
                </Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  {...register("startDate")}
                  className="ll:text-xs"
                />
                <TimerFormFieldError
                  message={getFieldErrorMessage(errors.startDate)}
                />
              </div>
              <div className="ll:w-full">
                <Label htmlFor="endDate" className={fieldLabelClassName}>
                  {t("addForm.endDateLabel")}
                </Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  {...register("endDate")}
                  className="ll:text-xs"
                />
                <TimerFormFieldError
                  message={getFieldErrorMessage(errors.endDate)}
                />
              </div>
              {startDate && endDate && (
                <p className="ll:text-[11px] ll:text-gray-400">
                  {t("addForm.windowLabel")}{" "}
                  {getSpawnWindowLabel(
                    startDate,
                    endDate,
                    t("addForm.invalidRange"),
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="ll:flex ll:shrink-0 ll:items-center ll:justify-end ll:gap-1 ll:border-t ll:border-x-0 ll:border-b-0 ll:border-gray-400/40 ll:px-3 ll:py-1.5">
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={props.onClose}
          disabled={isPending}
        >
          {t("addForm.cancel")}
        </Button>
        <Button
          type="submit"
          size="xs"
          variant="secondary"
          loading={isPending}
          disabled={!selectedGuildId}
        >
          {t("addForm.submit")}
        </Button>
      </div>
    </form>
  );
}
