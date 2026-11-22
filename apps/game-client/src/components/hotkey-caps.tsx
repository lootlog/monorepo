import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { formatBindingParts, type HotkeyBinding } from "@/store/hotkeys.store";
import { Fragment, type FC } from "react";

type HotkeyCapsProps = {
  binding: HotkeyBinding;
  className?: string;
  kbdClassName?: string;
};

export const HotkeyCaps: FC<HotkeyCapsProps> = ({
  binding,
  className,
  kbdClassName,
}) => (
  <KbdGroup className={className}>
    {formatBindingParts(binding).map((part, index) => (
      <Fragment key={`${index}-${part}`}>
        {index > 0 ? " + " : null}
        <Kbd className={kbdClassName}>{part}</Kbd>
      </Fragment>
    ))}
  </KbdGroup>
);
