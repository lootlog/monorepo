import Image from "next/image";

type LootlogMarkProps = {
  className?: string;
};

export function LootlogMark({ className }: LootlogMarkProps) {
  return (
    <Image
      src="/brand/lootlog-mark.svg"
      alt=""
      aria-hidden="true"
      width={64}
      height={64}
      className={className}
    />
  );
}
