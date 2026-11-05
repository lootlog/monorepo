import { Button } from "@lootlog/ui/components/button";
import { Textarea } from "@lootlog/ui/components/textarea";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import {
  LOOT_COMMENT_MAX_LENGTH,
  type LootCommentsState,
} from "./use-loot-comments";

export const LootCommentForm = ({
  comments,
  className,
  textareaClassName,
}: {
  comments: LootCommentsState;
  className?: string;
  textareaClassName?: string;
}) => {
  const { t } = useTranslation();
  const { value, setValue, submit, isPending, isSubmitDisabled } = comments;

  return (
    <form
      className={cn("space-y-2", className)}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Textarea
        className={cn(
          "min-h-20 w-full resize-y rounded-xl border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary/60",
          textareaClassName,
        )}
        placeholder={t("loots.details.comments.placeholder")}
        maxLength={LOOT_COMMENT_MAX_LENGTH}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs tabular-nums text-muted-foreground">
          {value.length}/{LOOT_COMMENT_MAX_LENGTH}
        </span>
        <Button
          className="text-xs"
          size="sm"
          type="submit"
          disabled={isSubmitDisabled}
          loading={isPending}
        >
          {t("loots.details.comments.submit")}
        </Button>
      </div>
    </form>
  );
};
