export function LootlogMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect x="16" y="16" width="480" height="480" rx="112" fill="#0d1a2c" />
      <path
        d="M373.4 138.6A166 166 0 1 0 419.5 227.2"
        fill="none"
        stroke="#c8f135"
        strokeLinecap="round"
        strokeWidth="58"
      />
      <circle cx="419.5" cy="227.2" r="32" fill="#35d3e4" />
    </svg>
  );
}
