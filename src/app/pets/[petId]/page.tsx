import { PetWorkspace } from "@/components/record/HealthRecordApp";

export default async function PetProfilePage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId } = await params;

  return <PetWorkspace petId={petId} section="profile" />;
}
