import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { LayoutTemplate } from "lucide-react";
import type { EventScoringRule } from "@lootlog/domain/scoring";
import { SCORING_RULE_TEMPLATES } from "../../utils/scoring-rule-templates";

interface ScoringRuleTemplatesMenuProps {
  onSelectTemplate: (rule: EventScoringRule) => void;
  onApplyGroupRulebook: () => void;
}

export const ScoringRuleTemplatesMenu = ({
  onSelectTemplate,
  onApplyGroupRulebook,
}: ScoringRuleTemplatesMenuProps) => {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            <LayoutTemplate className="size-4" />
            {t("events.scoring.template.menuLabel")}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {t("events.scoring.template.sectionSets")}
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={onApplyGroupRulebook}
            className="flex flex-col items-start gap-0.5 py-2"
          >
            <span className="text-sm font-medium">
              {t("events.scoring.template.groupRulebook")}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("events.scoring.template.groupRulebookDesc")}
            </span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {t("events.scoring.template.sectionRules")}
          </DropdownMenuLabel>
          {SCORING_RULE_TEMPLATES.map((template) => (
            <DropdownMenuItem
              key={template.id}
              onClick={() => onSelectTemplate(template.createRule())}
              className="flex flex-col items-start gap-0.5 py-2"
            >
              <span className="text-sm font-medium">{t(template.i18nKey)}</span>
              <span className="text-xs text-muted-foreground">
                {t(template.i18nDescriptionKey)}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
