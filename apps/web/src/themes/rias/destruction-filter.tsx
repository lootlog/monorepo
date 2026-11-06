// SVG filter for destruction energy glow
export const DestructionFilter = () => (
  <svg width="0" height="0" className="absolute">
    <defs>
      <filter
        id="destruction-glow"
        x="-20%"
        y="-20%"
        width="140%"
        height="140%"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.04"
          numOctaves="3"
          result="noise"
        />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer result="energy">
          <feFuncA type="table" tableValues="0 0.06 0.1 0.08 0.05" />
        </feComponentTransfer>
        <feFlood floodColor="rgb(200, 30, 60)" result="color" />
        <feComposite in="color" in2="energy" operator="in" />
      </filter>
      <filter
        id="destruction-glow-subtle"
        x="-20%"
        y="-20%"
        width="140%"
        height="140%"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.03"
          numOctaves="2"
          result="noise"
        />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer result="energy">
          <feFuncA type="table" tableValues="0 0.02 0.04 0.03 0.01" />
        </feComponentTransfer>
        <feFlood floodColor="rgb(200, 30, 60)" result="color" />
        <feComposite in="color" in2="energy" operator="in" />
      </filter>
    </defs>
  </svg>
);
