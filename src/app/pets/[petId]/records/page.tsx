import { PetWorkspace } from "@/components/record/HealthRecordApp";

export default async function PetRecordsPage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId } = await params;

  return <PetWorkspace petId={petId} section="records" />;
}
