import * as React from "react";

export function useThemeClass(className: string | string[]): boolean {
  const classes = Array.isArray(className) ? className : [className];

  const [active, setActive] = React.useState(() => {
    if (typeof document === "undefined") return false;
    return classes.some((c) => document.documentElement.classList.contains(c));
  });

  React.useEffect(() => {
    const root = document.documentElement;
    const check = () =>
      setActive(classes.some((c) => root.classList.contains(c)));
    const observer = new MutationObserver(check);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return active;
}
