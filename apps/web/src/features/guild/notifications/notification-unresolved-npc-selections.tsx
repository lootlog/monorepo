import type { NotificationRuleUnresolvedSelectionDto } from "@lootlog/client/main";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lootlog/ui/components/alert";
import { Button } from "@lootlog/ui/components/button";
import type { TFunction } from "i18next";
import { AlertTriangle } from "lucide-react";
import { replaceNotificationRuleNpcSelection } from "./utils/notification-rule-form-npc.utils";

type Props = {
  readonly selections: readonly NotificationRuleUnresolvedSelectionDto[];
  readonly value: readonly string[];
  readonly onChange: (value: string[]) => void;
  readonly isAllWorlds: boolean;
  readonly isManualNpcEntry: boolean;
  readonly t: TFunction;
};

/**
 * Saved timer NPC ids that the legacy association repair could not match to
 * a timer. The rule keeps matching only its saved ids; a member replaces an id
 * with the suggested timer or removes it, and saving the rule clears it.
 */
export const NotificationUnresolvedNpcSelections = ({
  selections,
  value,
  onChange,
  isAllWorlds,
  isManualNpcEntry,
  t,
}: Props) => {
  const pending = selections.filter(
    (selection) =>
      selection.kind === "npc" && value.includes(String(selection.selectedId)),
  );

  if (pending.length === 0) return null;

  return (
    <Alert variant="alert">
      <AlertTriangle />
      <AlertTitle>
        {t("settings.notifications.unresolvedSelections.title", {
          count: pending.length,
        })}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>{t("settings.notifications.unresolvedSelections.description")}</p>
        <ul className="flex flex-col gap-3">
          {pending.map((selection) => {
            const canReplace =
              selection.suggestedId !== null &&
              !isAllWorlds &&
              !isManualNpcEntry;

            const canRemove = value.length > 1 && !isManualNpcEntry;

            return (
              <li key={selection.selectedId} className="flex flex-col gap-2">
                <p>
                  <span className="font-medium">
                    {t("settings.notifications.unresolvedSelections.selected", {
                      name:
                        selection.selectedName ??
                        t(
                          "settings.notifications.unresolvedSelections.unknownName",
                        ),
                      id: selection.selectedId,
                    })}
                  </span>{" "}
                  {t(
                    `settings.notifications.unresolvedSelections.reasons.${selection.reason}`,
                  )}
                </p>
                {selection.suggestedId !== null ? (
                  <p>
                    {t(
                      "settings.notifications.unresolvedSelections.suggested",
                      {
                        name: selection.suggestedName ?? "",
                        id: selection.suggestedId,
                      },
                    )}
                  </p>
                ) : null}
                {canReplace || canRemove ? (
                  <div className="flex flex-wrap gap-2">
                    {canReplace ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          onChange(
                            replaceNotificationRuleNpcSelection(
                              value,
                              selection.selectedId,
                              selection.suggestedId,
                            ),
                          )
                        }
                      >
                        {t(
                          "settings.notifications.unresolvedSelections.actions.useSuggested",
                        )}
                      </Button>
                    ) : null}
                    {canRemove ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onChange(
                            replaceNotificationRuleNpcSelection(
                              value,
                              selection.selectedId,
                              null,
                            ),
                          )
                        }
                      >
                        {t(
                          "settings.notifications.unresolvedSelections.actions.remove",
                        )}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {selection.suggestedId !== null && isAllWorlds ? (
                  <p>
                    {t(
                      "settings.notifications.unresolvedSelections.suggestedNeedsWorld",
                    )}
                  </p>
                ) : null}
                {value.length === 1 && selection.suggestedId === null ? (
                  <p>
                    {t(
                      "settings.notifications.unresolvedSelections.onlySelection",
                    )}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p>{t("settings.notifications.unresolvedSelections.saveHint")}</p>
      </AlertDescription>
    </Alert>
  );
};
