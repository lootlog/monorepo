import { useEffect, useState, type FormEvent } from "react";
import { Link as LinkIcon } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { useTranslation } from "react-i18next";

type GuildDocLinkDialogProps = {
  open: boolean;
  selectedText: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { text: string; url: string }) => void;
};

export const GuildDocLinkDialog = ({
  open,
  selectedText,
  onOpenChange,
  onSubmit,
}: GuildDocLinkDialogProps) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const needsText = selectedText.trim().length === 0;
  const canSubmit =
    url.trim().length > 0 && (!needsText || text.trim().length > 0);

  useEffect(() => {
    if (!open) {
      return;
    }

    setUrl("");
    setText(selectedText);
  }, [open, selectedText]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!canSubmit) {
      return;
    }

    onSubmit({
      text: text.trim(),
      url: url.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="size-4" />
            {t("docs.linkDialog.title")}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4 px-4 pb-4 pt-1" onSubmit={handleSubmit}>
          {needsText && (
            <div className="space-y-2">
              <Label htmlFor="guild-doc-link-text">
                {t("docs.linkDialog.text")}
              </Label>
              <Input
                id="guild-doc-link-text"
                name="guild-doc-link-text"
                autoComplete="off"
                value={text}
                placeholder={t("docs.linkDialog.textPlaceholder")}
                onChange={(event) => setText(event.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="guild-doc-link-url">
              {t("docs.linkDialog.url")}
            </Label>
            <Input
              id="guild-doc-link-url"
              name="guild-doc-link-url"
              autoComplete="off"
              value={url}
              placeholder={t("docs.linkDialog.urlPlaceholder")}
              onChange={(event) => setUrl(event.target.value)}
            />
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
              {t("docs.linkDialog.insert")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
