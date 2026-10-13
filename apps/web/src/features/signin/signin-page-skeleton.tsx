import { PageHeader } from "@/components/common/page-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";

export const SigninPageSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 px-4">
        <PageHeader
          title={t("auth.signin.title")}
          description={t("auth.signin.description")}
        >
          <SectionCardContent>
            <Skeleton className="h-11 w-full rounded-md" />
          </SectionCardContent>
        </PageHeader>
      </div>
    </div>
  );
};
