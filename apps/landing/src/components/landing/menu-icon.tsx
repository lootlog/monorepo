export function MenuIcon({ open }: { open: boolean }) {
  return (
    <span aria-hidden="true" className="relative block size-6">
      {[0, 1, 2].map((line) => (
        <span
          key={line}
          className="absolute left-0.5 top-[11px] h-0.5 w-5 rounded-full bg-current transition-[transform,opacity] duration-300 ease-in-out motion-reduce:transition-none"
          style={{
            transform: open
              ? `rotate(${line === 0 ? 45 : line === 2 ? -45 : 0}deg)`
              : `translateY(${(line - 1) * 6}px)`,
            opacity: open && line === 1 ? 0 : 1,
          }}
        />
      ))}
    </span>
  );
}
