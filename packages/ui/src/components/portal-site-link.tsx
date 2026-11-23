import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { ArrowUpRightIcon } from "lucide-react";

type PortalSiteLinkProps = useRender.ComponentProps<"a"> & {
  site: { href: string; thirdParty: boolean };
};

export function PortalSiteLink({
  site,
  render,
  children,
  ...props
}: PortalSiteLinkProps) {
  return useRender({
    defaultTagName: "a",
    render,
    props: mergeProps<"a">(
      {
        href: site.href,
        ...(site.thirdParty && {
          target: "_blank",
          rel: "noopener noreferrer",
        }),
        children: (
          <>
            {children}
            <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
          </>
        ),
      },
      props,
    ),
  });
}
