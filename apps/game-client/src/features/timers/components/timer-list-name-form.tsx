import { useState, type FC } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TIMER_LIST_NAME_MAX_LENGTH = 32;

type TimerListNameFormProps = {
  /** Current name when renaming; a create form starts empty and clears after each list. */
  defaultName?: string;
  placeholder: string;
  "aria-label": string;
  submitLabel: string;
  autoFocus?: boolean;
  onSubmit: (name: string) => void;
};

/** Names a timer list; Enter submits, and a blank name is not accepted. */
export const TimerListNameForm: FC<TimerListNameFormProps> = ({
  defaultName,
  placeholder,
  "aria-label": ariaLabel,
  submitLabel,
  autoFocus,
  onSubmit,
}) => {
  const [name, setName] = useState(defaultName ?? "");
  const trimmedName = name.trim();

  return (
    <form
      className="ll:flex ll:items-center ll:gap-1"
      onSubmit={(event) => {
        event.preventDefault();

        if (!trimmedName) return;
        onSubmit(trimmedName);

        if (defaultName === undefined) setName("");
      }}
    >
      <Input
        value={name}
        placeholder={placeholder}
        aria-label={ariaLabel}
        maxLength={TIMER_LIST_NAME_MAX_LENGTH}
        autoFocus={autoFocus}
        className="ll:min-w-0 ll:flex-1"
        // A rename starts with the current name selected, ready to be retyped.
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setName(event.target.value)}
      />
      <Button type="submit" size="sm" disabled={!trimmedName}>
        {submitLabel}
      </Button>
    </form>
  );
};
