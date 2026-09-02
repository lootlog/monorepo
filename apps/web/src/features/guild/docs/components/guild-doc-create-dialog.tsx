import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { useDocsControllerCreateDocument } from "@lootlog/client/main";
import { invalidateGuildDocsQueries } from "../docs-api";
import { useTranslation } from "react-i18next";

type GuildDocCreateDialogProps = {
  canCreate: boolean;
  guildId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const GuildDocCreateDialog = ({
  canCreate,
  guildId,
  open,
  onOpenChange,
}: GuildDocCreateDialogProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const createDocument = useDocsControllerCreateDocument();
  const trimmedTitle = title.trim();
  const titleTooLong = trimmedTitle.length > 120;
  const canSubmit =
    canCreate &&
    trimmedTitle.length > 0 &&
    !titleTooLong &&
    !createDocument.isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    createDocument.mutate(
      {
        pathParams: { guildId },
        data: { title: trimmedTitle },
      },
      {
        onError: () => {
          toast.error(t("docs.editor.saveError"));
        },
        onSuccess: async (document) => {
          await invalidateGuildDocsQueries(queryClient, guildId, document.id);
          setTitle("");
          onOpenChange(false);
          navigate({
            to: `/${guildId}/docs/${document.id}`,
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="size-4" />
            {t("docs.list.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("docs.list.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4 px-4 pb-4 pt-1" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="guild-doc-title">{t("docs.list.titleLabel")}</Label>
            <Input
              id="guild-doc-title"
              name="guild-doc-title"
              autoComplete="off"
              value={title}
              maxLength={120}
              placeholder={t("docs.list.titlePlaceholder")}
              onChange={(event) => setTitle(event.target.value)}
            />
            {titleTooLong && (
              <p className="text-xs text-destructive">
                {t("docs.editor.titleTooLong")}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {createDocument.isPending
                ? t("common.saving")
                : t("docs.list.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
