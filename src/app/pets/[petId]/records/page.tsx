import { PetWorkspace } from "@/components/pet/PetWorkspace";

export default async function PetRecordsPage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId } = await params;

  return <PetWorkspace petId={petId} section="records" />;
}
