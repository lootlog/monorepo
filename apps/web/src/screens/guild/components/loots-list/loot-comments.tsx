import { Button } from "@lootlog/ui/components/button";
import { FC, useState } from "react";
import { Textarea } from "@lootlog/ui/components/textarea";
import { LootSingleComment } from "@/screens/guild/components/loots-list/loot-single-comment";
import { useLootComments } from "@/hooks/api/use-loot-comments";
import { useCreateLootComment } from "@/hooks/api/use-create-loot-comment";
import { Loader2 } from "lucide-react";

const MAX_LENGTH = 256;

type LootCommentProps = {
  lootId: number;
};

export const LootComments: FC<LootCommentProps> = ({ lootId }) => {
  const { data: comments } = useLootComments({ lootId });
  const { mutate: createComment, isPending } = useCreateLootComment();
  const [value, setValue] = useState("");

  const handleAddComment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (value.length > 0 && value.length <= MAX_LENGTH) {
      createComment({ content: value, lootId });
      setValue("");
    }
  };

  return (
    <div className="space-y-2 flex flex-col">
      <div className="p-4 flex flex-col border-b gap-2">
        <form onSubmit={handleAddComment}>
          <Textarea
            className="w-full h-24 p-2 border rounded"
            placeholder="Dodaj komentarz..."
            autoFocus={false}
            maxLength={MAX_LENGTH}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {value.length}/{MAX_LENGTH}
            </span>
            <Button
              className="mt-2 h-8 w-32"
              size="sm"
              type="submit"
              disabled={
                value.length === 0 || value.length > MAX_LENGTH || isPending
              }
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Dodaj komentarz"
              )}
            </Button>
          </div>
        </form>
      </div>

      <h3 className="text-sm font-semibold px-4 pb-2 border-b">
        Komentarze ({comments?.length || 0})
      </h3>
      <ul className="p-0 !m-0">
        {comments?.map((comment) => (
          <LootSingleComment key={comment.id} comment={comment} />
        ))}
      </ul>
    </div>
  );
};
