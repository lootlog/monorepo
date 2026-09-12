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
import { GuildSwitcher } from "@/components/guild-switcher";
import {
  CreateManualTimerDtoType,
  type SearchTimersNpcResponseDtoOutput,
} from "@lootlog/client/main";
import { AutocompleteSuggestions } from "@/components/ui/autocomplete-suggestions";
import { getNpcTypeNames } from "@/constants/margonem";
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

export function AddTimerForm(props: AddTimerFormProps) {
  const {
    t,
    isPending,
    visibleGuilds,
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
    handleGuildSelectionChange,
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
      className="ll:flex ll:flex-col ll:h-full ll:overflow-hidden ll:w-full"
    >
      {visibleGuilds.length !== 1 && (
        <div className="ll:shrink-0 ll:pt-1 ll:pb-2">
          {visibleGuilds.length > 1 && <Label>{t("addForm.guildLabel")}</Label>}
          <GuildSwitcher
            value={selectedGuildId}
            onChange={handleGuildSelectionChange}
            disabled={isPending}
          />
        </div>
      )}

      <div className="ll:min-h-0 ll:flex-1 ll:overflow-hidden">
        <ScrollArea
          data-testid="add-timer-scroll-container"
          className="ll:h-full ll:w-full"
        >
          <div className="ll:flex ll:flex-col ll:gap-2 ll:w-full ll:px-1">
            <div className="ll:relative ll:w-full">
              <Label htmlFor="npcSearch">{t("addForm.searchNpcLabel")}</Label>
              <Input
                id="npcSearch"
                autoComplete="off"
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
                  const longname =
                    getNpcTypeNames(npc.type)?.longname ??
                    t("addForm.mobFallback");

                  const npcDetails =
                    npc.lvl > 0 && npc.prof
                      ? ` ${npc.lvl}${npc.prof.charAt(0).toLowerCase()}`
                      : "";

                  return (
                    <div
                      className={`ll:px-3 ll:py-2 ll:text-xs ll:border-b ll:border-gray-600/50 last:ll:border-b-0 ${
                        isSelected
                          ? "ll:bg-blue-500/30"
                          : "ll:hover:bg-gray-700/50"
                      }`}
                    >
                      <div className="ll:font-semibold ll:text-white">
                        {npc.name}
                      </div>
                      <div className="ll:text-gray-400 ll:text-[10px]">
                        {longname} • {npcDetails}
                      </div>
                    </div>
                  );
                }}
                noResultsMessage={t("addForm.npcNotFound")}
                showNoResults={showNoResults}
              />
            </div>

            <div className="ll:w-full">
              <Label htmlFor="name">{t("addForm.nameLabel")}</Label>
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
              <TimerFormFieldError
                message={getFieldErrorMessage(errors.name)}
              />
            </div>

            <div className="ll:grid ll:grid-cols-1 ll:gap-2 ll:sm:grid-cols-2 ll:w-full">
              <div className="ll:min-w-0">
                <Label htmlFor="lvl">{t("addForm.lvlLabel")}</Label>
                <Input
                  id="lvl"
                  type="number"
                  min={MIN_NPC_LEVEL}
                  max={MAX_NPC_LEVEL}
                  step={1}
                  autoComplete="off"
                  placeholder={t("addForm.lvlPlaceholder")}
                  {...register("lvl")}
                />
                <TimerFormFieldError
                  message={getFieldErrorMessage(errors.lvl)}
                />
              </div>
              <div className="ll:min-w-0">
                <Label htmlFor="npcType">{t("addForm.typeLabel")}</Label>
                <Select
                  value={selectedNpcType}
                  onValueChange={(value) => {
                    setValue("type", resolveManualTimerNpcType(value));
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger
                    id="npcType"
                    aria-label={t("addForm.typeLabel")}
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

            <div className="ll:w-full">
              <Label htmlFor="minDuration">
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

            <div className="ll:w-full">
              <Label htmlFor="maxDuration">
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

            <div className="ll:mt-2 ll:flex ll:items-center ll:gap-2">
              <Switch
                id="customDates"
                checked={customDatesEnabled}
                onCheckedChange={(checked) => handleCustomDatesToggle(checked)}
              />
              <Label htmlFor="customDates">{t("addForm.customDates")}</Label>
            </div>

            {customDatesEnabled && (
              <div className="ll:flex ll:flex-col ll:gap-2 ll:w-full">
                <div className="ll:w-full">
                  <Label htmlFor="startDate">
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
                  <Label htmlFor="endDate">{t("addForm.endDateLabel")}</Label>
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
                  <p className="ll:text-xs ll:text-gray-400">
                    {t("addForm.windowLabel")}{" "}
                    {new Date(endDate).getTime() -
                      new Date(startDate).getTime() >
                    0
                      ? `${Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / 60000)}m`
                      : t("addForm.invalidRange")}
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="ll:flex ll:justify-center ll:border-gray-600 ll:pt-1 ll:pb-0.5 ll:px-1 ll:shrink-0">
        <button
          type="submit"
          className="ll:text-[12px] ll:border ll:border-gray-400 ll:bg-gray-400/30 ll:hover:bg-gray-400/50 ll:rounded-sm ll:h-5 ll:text-white ll:px-4"
          disabled={isPending || !selectedGuildId}
        >
          {isPending ? t("addForm.submitting") : t("addForm.submit")}
        </button>
      </div>
    </form>
  );
}
