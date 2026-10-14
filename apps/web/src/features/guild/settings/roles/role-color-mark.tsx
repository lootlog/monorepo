/** A role's colour as a dot on a tint of itself, in the place of a tile's icon. */
export const RoleColorMark = ({ color }: { color: string }) => (
  <span
    aria-hidden
    className="flex size-9 shrink-0 items-center justify-center rounded-lg"
    style={{ backgroundColor: `#${color}20` }}
  >
    <span
      className="size-3.5 rounded-full"
      style={{ backgroundColor: `#${color}` }}
    />
  </span>
);
