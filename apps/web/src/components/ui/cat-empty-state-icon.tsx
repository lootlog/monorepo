export const CatEmptyStateIcon: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Ears */}
      <path
        d="M30 45 L20 15 L45 35 Z"
        fill="currentColor"
        opacity="0.15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M90 45 L100 15 L75 35 Z"
        fill="currentColor"
        opacity="0.15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Inner ears */}
      <path d="M32 42 L25 22 L43 37 Z" fill="currentColor" opacity="0.08" />
      <path d="M88 42 L95 22 L77 37 Z" fill="currentColor" opacity="0.08" />
      {/* Head */}
      <ellipse
        cx="60"
        cy="62"
        rx="32"
        ry="28"
        fill="currentColor"
        opacity="0.1"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Closed eyes (sleeping) */}
      <path
        d="M42 58 Q47 62 52 58"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M68 58 Q73 62 78 58"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      {/* Nose */}
      <path d="M58 68 L60 71 L62 68 Z" fill="currentColor" opacity="0.4" />
      {/* Mouth */}
      <path
        d="M60 71 Q55 76 50 73"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
      <path
        d="M60 71 Q65 76 70 73"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
      {/* Whiskers */}
      <line
        x1="15"
        y1="63"
        x2="38"
        y2="66"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.25"
        strokeLinecap="round"
      />
      <line
        x1="17"
        y1="72"
        x2="39"
        y2="70"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.25"
        strokeLinecap="round"
      />
      <line
        x1="82"
        y1="66"
        x2="105"
        y2="63"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.25"
        strokeLinecap="round"
      />
      <line
        x1="81"
        y1="70"
        x2="103"
        y2="72"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.25"
        strokeLinecap="round"
      />
      {/* Zzz */}
      <text
        x="88"
        y="38"
        fill="currentColor"
        opacity="0.3"
        fontSize="14"
        fontWeight="bold"
      >
        z
      </text>
      <text
        x="96"
        y="28"
        fill="currentColor"
        opacity="0.2"
        fontSize="11"
        fontWeight="bold"
      >
        z
      </text>
      <text
        x="102"
        y="20"
        fill="currentColor"
        opacity="0.15"
        fontSize="9"
        fontWeight="bold"
      >
        z
      </text>
    </svg>
  );
};
