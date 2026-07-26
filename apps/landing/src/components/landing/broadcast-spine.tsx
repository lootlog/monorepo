export function BroadcastSpine() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-3 z-40 hidden w-1 flex-col opacity-90 lg:flex"
    >
      <span className="relative flex-[1.15] bg-[#c8f135]">
        <span className="absolute -bottom-1.5 -left-1 size-3 rounded-full border-[3px] border-[#07111f] bg-[#3157f6]" />
      </span>
      <span className="relative flex-[1.9] bg-[#3157f6]">
        <span className="absolute -bottom-1.5 -left-1 size-3 rounded-full border-[3px] border-[#07111f] bg-[#ff665b]" />
      </span>
      <span className="relative flex-[1.2] bg-[#ff665b]">
        <span className="absolute -bottom-1.5 -left-1 size-3 rounded-full border-[3px] border-[#07111f] bg-[#ffbd3f]" />
      </span>
      <span className="relative flex-[0.85] bg-[#ffbd3f]">
        <span className="absolute -bottom-1.5 -left-1 size-3 rounded-full border-[3px] border-[#07111f] bg-[#35d3e4]" />
      </span>
      <span className="relative flex-1 bg-[#35d3e4]">
        <span className="absolute -bottom-1.5 -left-1 size-3 rounded-full border-[3px] border-[#07111f] bg-[#ff665b]" />
      </span>
      <span className="flex-[0.9] bg-[#ff665b]" />
    </div>
  );
}
