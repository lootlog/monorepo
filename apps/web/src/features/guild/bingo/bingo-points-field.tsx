import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import type { ComponentProps } from "react";

type BingoPointsFieldProps = Omit<ComponentProps<typeof Input>, "type"> & {
  readonly id: string;
  readonly label: string;
};

export const BingoPointsField = ({
  id,
  label,
  ...inputProps
}: BingoPointsFieldProps) => (
  <div className="flex flex-col justify-between gap-2">
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} type="number" min={0} max={1000} {...inputProps} />
  </div>
);
