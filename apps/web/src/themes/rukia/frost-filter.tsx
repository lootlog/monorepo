// SVG Frost Filter - creates organic ice texture
export const FrostFilter = () => (
  <svg width="0" height="0" className="absolute">
    <defs>
      <filter id="frost-noise" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.05"
          numOctaves="4"
          result="noise"
        />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer result="frost">
          <feFuncA type="table" tableValues="0 0.08 0.15 0.12 0.08" />
        </feComponentTransfer>
        <feFlood floodColor="rgb(220, 240, 255)" result="color" />
        <feComposite in="color" in2="frost" operator="in" />
      </filter>
      <filter id="frost-noise-subtle" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.03"
          numOctaves="3"
          result="noise"
        />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer result="frost">
          <feFuncA type="table" tableValues="0 0.03 0.06 0.04 0.02" />
        </feComponentTransfer>
        <feFlood floodColor="rgb(220, 240, 255)" result="color" />
        <feComposite in="color" in2="frost" operator="in" />
      </filter>
    </defs>
  </svg>
);
