import { useEffect, useState, type FormEvent } from "react";
import type { InsertTableCommandPayload } from "@lexical/table";
import { Table2 } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
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
import { useTranslation } from "react-i18next";

const DEFAULT_TABLE_SIZE = 3;
const MIN_TABLE_SIZE = 1;
const MAX_TABLE_SIZE = 20;

type GuildDocTableDialogProps = {
  open: boolean;
  onInsert: (payload: InsertTableCommandPayload) => void;
  onOpenChange: (open: boolean) => void;
};

const normalizeTableSize = (value: string) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue)) {
    return DEFAULT_TABLE_SIZE;
  }

  return Math.min(Math.max(parsedValue, MIN_TABLE_SIZE), MAX_TABLE_SIZE);
};

export const GuildDocTableDialog = ({
  open,
  onInsert,
  onOpenChange,
}: GuildDocTableDialogProps) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState(String(DEFAULT_TABLE_SIZE));
  const [columns, setColumns] = useState(String(DEFAULT_TABLE_SIZE));
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const normalizedRows = normalizeTableSize(rows);
  const normalizedColumns = normalizeTableSize(columns);
  const canSubmit = rows.trim().length > 0 && columns.trim().length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    setRows(String(DEFAULT_TABLE_SIZE));
    setColumns(String(DEFAULT_TABLE_SIZE));
    setIncludeHeaders(true);
  }, [open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!canSubmit) {
      return;
    }

    onInsert({
      columns: String(normalizedColumns),
      includeHeaders,
      rows: String(normalizedRows),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Table2 className="size-4" />
            {t("docs.tableDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("docs.tableDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4 px-4 pb-4 pt-1" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guild-doc-table-rows">
                {t("docs.tableDialog.rows")}
              </Label>
              <Input
                id="guild-doc-table-rows"
                type="number"
                name="guild-doc-table-rows"
                inputMode="numeric"
                autoComplete="off"
                min={MIN_TABLE_SIZE}
                max={MAX_TABLE_SIZE}
                value={rows}
                onChange={(event) => setRows(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guild-doc-table-columns">
                {t("docs.tableDialog.columns")}
              </Label>
              <Input
                id="guild-doc-table-columns"
                type="number"
                name="guild-doc-table-columns"
                inputMode="numeric"
                autoComplete="off"
                min={MIN_TABLE_SIZE}
                max={MAX_TABLE_SIZE}
                value={columns}
                onChange={(event) => setColumns(event.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-2">
            <Checkbox
              id="guild-doc-table-headers"
              checked={includeHeaders}
              onCheckedChange={(checked) => setIncludeHeaders(checked === true)}
            />
            <Label
              htmlFor="guild-doc-table-headers"
              className="cursor-pointer text-sm font-normal"
            >
              {t("docs.tableDialog.includeHeaders")}
            </Label>
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
              {t("docs.tableDialog.insert")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
