type LootlogMarkProps = {
  className?: string;
};

export function LootlogMark({ className }: LootlogMarkProps) {
  return (
    <img
      src="/brand/lootlog-mark.svg"
      alt=""
      aria-hidden="true"
      width={64}
      height={64}
      className={className}
    />
  );
}
