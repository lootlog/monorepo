import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { AsyncStatusIndicator } from "@/components/async-status-indicator";
import { GuildSelect } from "@/components/guild-select";
import { Kbd } from "@/components/ui/kbd";
import { ChatComposeField } from "@/features/chat/components/chat-compose-field";
import { ChatComposeModeIcon } from "@/features/chat/components/chat-compose-mode-icon";
import { ChatMentionSuggestions } from "@/features/chat/components/chat-mention-suggestions";
import { useChatInputController } from "@/features/chat/components/use-chat-input-controller";
import { useGuildTargets } from "@/hooks/use-guild-targets";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { useChatStore } from "@/store/chat.store";
import { clearCommandDraft, COMMAND_DRAFT_KEY } from "../command-draft";
import { getCommandMode, toggleCommandMode } from "../command-mode.helpers";
import { CommandModeToggle } from "./command-mode-toggle";

type CommandComposerProps = {
  /** Closes the console; the draft stays unless the caller clears it. */
  onClose: () => void;
};

/**
 * The chat composer bound to one Lootlog of the player's choice: mentions,
 * command suggestions and the `/grp`/`!` chips behave exactly as in the chat,
 * and a successful entry closes the console.
 */
export const CommandComposer: FC<CommandComposerProps> = ({ onClose }) => {
  const { t } = useTranslation("command");
  const { t: tCommon } = useTranslation("common");

  const { commandGuildId, setCommandGuildId } = useChatStore(
    useShallow((state) => ({
      commandGuildId: state.commandGuildId,
      setCommandGuildId: state.setCommandGuildId,
    })),
  );

  const {
    guildsQuery: { data: guilds, error, refetch },
    visibleGuilds,
  } = useLootlogGuilds();

  const [targetGuildId] = useGuildTargets(
    commandGuildId ? [commandGuildId] : [],
  );

  const controller = useChatInputController({
    selectedGuildId: targetGuildId,
    autofocus: true,
    draftKey: COMMAND_DRAFT_KEY,
    handlesReplies: false,
    onSubmitted: onClose,
    onEscape: () => {
      clearCommandDraft();
      onClose();
    },
  });

  const {
    messageValue,
    isPending,
    activeSuggestions,
    suggestionMode,
    isMentionSuggestionsOpen,
    isFetchingMemberNames,
    isFetchingRoleNames,
    showMentionSuggestionNoResults,
    selectedMentionIndex,
    handleSuggestionSelect,
    replaceMessage,
    focusEditorCaret,
    caretIndex,
  } = controller;

  const mode = getCommandMode(messageValue);
  const hasTarget = targetGuildId !== undefined;

  let guildField = (
    <GuildSelect
      aria-label={t("target.label")}
      guilds={visibleGuilds}
      value={targetGuildId}
      disabled={isPending}
      className="ll:w-auto ll:max-w-56"
      onValueChange={(guildId) => {
        setCommandGuildId(guildId);
        focusEditorCaret(caretIndex);
      }}
    />
  );

  if (!guilds) {
    guildField = error ? (
      <AsyncStatusIndicator
        active
        kind="error"
        label={tCommon("async.guildsError")}
        onRetry={() => void refetch()}
        retryLabel={tCommon("actions.retry")}
      />
    ) : (
      <AsyncStatusIndicator
        active
        delay
        kind="loading"
        label={tCommon("async.loadingGuilds")}
      />
    );
  } else if (!hasTarget) {
    guildField = (
      <span className="ll:px-1.5 ll:text-xs ll:text-muted-foreground">
        {tCommon("guildSwitcher.allHidden")}
      </span>
    );
  }

  return (
    <div className="ll:relative">
      <div className="ll:relative ll:flex ll:h-11 ll:items-center ll:gap-2 ll:px-3">
        <ChatComposeModeIcon message={messageValue} className="ll:size-4" />
        <ChatComposeField
          controller={controller}
          size="md"
          shellClassName="ll:h-full"
          className="ll:self-stretch"
        />
        {isPending ? null : (
          <Kbd aria-hidden className="ll:shrink-0">
            Enter
          </Kbd>
        )}
        <ChatMentionSuggestions
          placement="below"
          suggestionMode={suggestionMode}
          suggestions={activeSuggestions}
          isOpen={suggestionMode !== null && activeSuggestions.length > 0}
          isLoading={
            isMentionSuggestionsOpen &&
            (isFetchingMemberNames || isFetchingRoleNames)
          }
          showNoResults={showMentionSuggestionNoResults}
          selectedIndex={selectedMentionIndex}
          onSelect={handleSuggestionSelect}
        />
      </div>
      <div className="ll:flex ll:items-center ll:gap-1 ll:rounded-b-lg ll:border-0 ll:border-t ll:border-solid ll:border-gray-400/40 ll:bg-white/[0.03] ll:px-1.5 ll:py-1.5">
        {guildField}
        <div className="ll:ml-auto ll:flex ll:shrink-0 ll:items-center ll:gap-0.5">
          <CommandModeToggle
            prefix="!"
            label={t("modes.notification")}
            pressed={mode === "notification"}
            disabled={isPending || !hasTarget}
            onToggle={() =>
              replaceMessage(toggleCommandMode(messageValue, "notification"))
            }
          />
          <CommandModeToggle
            prefix="/grp"
            label={t("modes.party")}
            pressed={mode === "party"}
            disabled={isPending || !hasTarget}
            onToggle={() =>
              replaceMessage(toggleCommandMode(messageValue, "party"))
            }
          />
        </div>
      </div>
    </div>
  );
};
