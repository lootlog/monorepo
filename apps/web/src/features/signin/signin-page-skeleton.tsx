import { PageHeader } from "@/components/common/page-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const SigninPageSkeleton = () => (
  <div className="flex min-h-screen items-center justify-center bg-background px-4">
    <PageHeader
      className="w-full max-w-md"
      title={<Skeleton className="h-5 w-48" />}
      description={<Skeleton className="h-3 w-full" />}
    >
      <SectionCardContent>
        <Skeleton className="h-10 w-full rounded-md" />
      </SectionCardContent>
    </PageHeader>
  </div>
);
