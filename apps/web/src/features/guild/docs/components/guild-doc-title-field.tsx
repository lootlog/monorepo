import { PenLine } from "lucide-react";

type GuildDocTitleFieldProps = {
  value: string;
  onChange: (value: string) => void;
  /** The document form the title is saved with, outside which it renders. */
  form: string;
  label: string;
  placeholder: string;
  maxLength: number;
};

/**
 * The document's title in place of its breadcrumb, edited where it is read.
 * A hidden copy of the text sizes the field, so it is as wide as the title,
 * and a quiet pencil after it says the title can be renamed.
 */
export const GuildDocTitleField = ({
  value,
  onChange,
  form,
  label,
  placeholder,
  maxLength,
}: GuildDocTitleFieldProps) => (
  <label className="group flex h-8 min-w-0 cursor-text items-center rounded-md pr-2 text-sm font-semibold transition-colors hover:bg-accent/50 has-[input:focus-visible]:bg-accent/50 has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring motion-reduce:transition-none">
    <span className="grid min-w-0 grid-cols-[minmax(0,auto)]">
      <span
        aria-hidden="true"
        className="invisible col-start-1 row-start-1 truncate pr-1.5 pl-2 whitespace-pre"
      >
        {value || placeholder}
      </span>
      {/* A size of one lets the copy above, not the browser default, set the width. */}
      <input
        size={1}
        form={form}
        name="guild-doc-editor-title"
        value={value}
        maxLength={maxLength}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="col-start-1 row-start-1 w-full min-w-0 bg-transparent pr-1.5 pl-2 text-ellipsis text-foreground outline-none placeholder:text-muted-foreground"
      />
    </span>
    {/* Fades while typing, so it never reads as part of the title. */}
    <PenLine
      aria-hidden="true"
      className="size-3.5 shrink-0 text-muted-foreground/60 transition-[color,opacity] group-hover:text-muted-foreground group-has-[input:focus]:opacity-0 motion-reduce:transition-none"
    />
  </label>
);
