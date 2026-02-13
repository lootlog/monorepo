import { UserDetailClient } from "@/src/components/admin/user-detail-client";

export default async function UserDetailsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return <UserDetailClient userId={userId} />;
}
