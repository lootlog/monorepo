import { MemberIdentity } from "@/components/common/member-identity";
import { useGuildMemberMap } from "@/hooks/api/use-guild-member-map";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { normalizeSearchText } from "@lootlog/domain/text-fold";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import type { MemberReferenceResponseDtoOutput } from "@lootlog/client/main";
import { cn } from "cn";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { $createTextNode, $isTextNode } from "lexical";
import { $createGuildDocMemberNode } from "./guild-doc-member-node";
import { comparePolish } from "@lootlog/domain/locale";

const MAX_SUGGESTIONS = 8;

class MemberMenuOption extends MenuOption {
  member: MemberReferenceResponseDtoOutput;

  constructor(member: MemberReferenceResponseDtoOutput) {
    super(member.userId);
    this.member = member;
  }
}

export const GuildDocMemberMentionPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const { t } = useTranslation();
  const [query, setQuery] = useState<string | null>(null);
  const members = useGuildMemberMap(useGuildId());

  const triggerFn = useBasicTypeaheadTriggerMatch("@", { minLength: 0 });

  const normalizedQuery = normalizeSearchText(query ?? "");

  const options =
    query === null
      ? []
      : [...members.values()]
          .filter(
            (member) =>
              member.active &&
              normalizeSearchText(member.name).includes(normalizedQuery),
          )
          .sort((first, second) => comparePolish(first.name, second.name))
          .slice(0, MAX_SUGGESTIONS)
          .map((member) => new MemberMenuOption(member));

  return (
    <LexicalTypeaheadMenuPlugin<MemberMenuOption>
      options={options}
      triggerFn={triggerFn}
      onQueryChange={setQuery}
      onSelectOption={(option, textNodeContainingQuery, closeMenu) => {
        editor.update(() => {
          const mention = $createGuildDocMemberNode({
            userId: option.member.userId,
            name: option.member.name,
          });

          if (textNodeContainingQuery) {
            textNodeContainingQuery.replace(mention);
          }

          const next = mention.getNextSibling();

          if ($isTextNode(next) && /^\s/.test(next.getTextContent())) {
            next.select(1, 1);
          } else {
            mention.insertAfter($createTextNode(" ")).selectEnd();
          }

          closeMenu();
        });
      }}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
      ) =>
        anchorElementRef.current && options.length > 0
          ? createPortal(
              <div className="mt-1 w-64 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
                <ul
                  role="listbox"
                  aria-label={t("docs.mention.listLabel")}
                  className="max-h-72 overflow-y-auto"
                >
                  {options.map((option, index) => (
                    <li
                      key={option.key}
                      ref={option.setRefElement}
                      role="option"
                      aria-selected={selectedIndex === index}
                      tabIndex={-1}
                      className={cn(
                        "flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm",
                        selectedIndex === index && "bg-primary/15",
                      )}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => {
                        setHighlightedIndex(index);
                        selectOptionAndCleanUp(option);
                      }}
                    >
                      <MemberIdentity
                        member={{ discordId: option.member.userId }}
                        fallback={{ name: option.member.name }}
                        interactive={false}
                        className="gap-2"
                        avatarClassName="size-6"
                      />
                    </li>
                  ))}
                </ul>
              </div>,
              anchorElementRef.current,
            )
          : null
      }
    />
  );
};
